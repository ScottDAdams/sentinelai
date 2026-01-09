"""
Sentinel Demo API - FastAPI Backend
"""
import os
import time
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client, Client
import json

load_dotenv()

# Build/version fingerprint
API_BUILD = os.getenv("API_BUILD", str(int(time.time())))

app = FastAPI(title="Sentinel Demo API", version="1.0.0")

# Print build info on startup
print(f"Sentinel Demo API starting - Build: {API_BUILD}")

# CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

supabase: Client = create_client(supabase_url, supabase_key)
demo_mode = os.getenv("DEMO_MODE", "true").lower() == "true"


def load_policies(policy_pack_version: str = "v1") -> List[dict]:
    """Load policies from Supabase for the given policy pack version"""
    policies_result = supabase.table("policies").select("*").eq("status", "ENABLED").execute()
    policies = []
    for p in policies_result.data:
        policies.append({
            "id": p["id"],
            "name": p["name"],
            "scope": p["scope"],
            "status": p["status"],
            "version": p["version"],
            "conditions": p["conditions"],
            "action": p["action"],
        })
    return policies


# Pydantic models (matching TypeScript types)
class Annotation(BaseModel):
    span: str
    policy_name: str
    action: str = Field(..., pattern="^(REDACT|BLOCK)$")
    start: int
    end: int


class CreateRunRequest(BaseModel):
    input_type: str = Field(..., pattern="^(chat|file|code)$")
    input_content: str
    scenario_id: Optional[str] = Field(None, pattern="^(pii_chat|file_comp|code_secret|injection)$")


class CreateRunResponse(BaseModel):
    run_id: str
    verdict: str = Field(..., pattern="^(SHIPPABLE|REDACTED|BLOCKED)$")
    user_message: str
    baseline_output: str
    governed_output: str
    annotations: List[Annotation]


class RunEvent(BaseModel):
    id: str
    run_id: str
    ts: str
    seq: int
    event_type: str
    payload: dict


class Run(BaseModel):
    id: str
    created_at: str
    input_type: str
    input_preview: Optional[str]
    input_content: str
    scenario_id: Optional[str]
    verdict: str
    baseline_output: Optional[str]
    governed_output: Optional[str]
    user_message: Optional[str]
    policy_pack_version: str
    meta: dict


class GetRunResponse(BaseModel):
    run: Run
    events: List[RunEvent]
    annotations: List[Annotation]


class Policy(BaseModel):
    id: str
    name: str
    scope: List[str]
    status: str
    version: int
    conditions: dict
    action: str
    updated_at: str
    updated_by: str


class ExportResponse(BaseModel):
    run: Run
    events: List[RunEvent]
    policy_snapshot: dict
    siem_payload_preview: dict


class GetPoliciesResponse(BaseModel):
    policy_pack_version: str
    policies: List[Policy]


# Stub logic for demo scenarios
def generate_demo_run(input_type: str, input_content: str, scenario_id: Optional[str] = None, policy_pack_version: str = "v1"):
    """Generate deterministic demo run results based on scenario or policy evaluation"""
    import re
    
    annotations = []
    events = []
    baseline_output = input_content
    governed_output = input_content
    verdict = "SHIPPABLE"
    user_message = "Output is ready to ship."
    
    # If no scenario_id provided, evaluate all policies from Supabase based on their patterns
    if not scenario_id:
        # Load policies from Supabase (no caching - fresh on each run)
        policies = load_policies(policy_pack_version)
        
        evaluated_policies = []
        all_matches = []
        
        # Evaluate each enabled policy that matches the input_type scope
        for policy in policies:
            if input_type not in policy["scope"]:
                continue  # Skip policies that don't apply to this input type
            
            policy_id = policy["id"]
            policy_name = policy["name"]
            policy_action = policy["action"]
            conditions = policy.get("conditions", {})
            
            # Get regex patterns from conditions.patterns (list of regex strings)
            regex_patterns = conditions.get("patterns", [])
            
            # Debug: Log policy evaluation details before matching
            conditions_keys = list(conditions.keys())
            patterns_preview = regex_patterns[:3] if len(regex_patterns) > 0 else []
            matching_method = "regex"  # Always using regex for patterns
            
            debug_info = {
                "policy_id": policy_id,
                "policy_name": policy_name,
                "conditions_keys": conditions_keys,
                "patterns_preview": patterns_preview,
                "patterns_count": len(regex_patterns),
                "matching_method": matching_method,
                "input_type": input_type,
                "input_length": len(input_content)
            }
            print(f"[POLICY_EVAL] {json.dumps(debug_info)}")
            
            # Evaluate each pattern for this policy using regex (re.finditer)
            for pattern_str in regex_patterns:
                try:
                    # Use re.finditer for regex pattern matching (not substring matching)
                    for match in re.finditer(pattern_str, input_content, re.IGNORECASE):
                        start, end = match.span()
                        all_matches.append((start, end, match.group(), policy_name, policy_action))
                except re.error as e:
                    # Log pattern errors but continue
                    print(f"Warning: Invalid regex pattern in policy {policy_name}: {pattern_str} - {e}")
            
            # Check if this policy had any matches
            if any(p[3] == policy_name for p in all_matches):
                evaluated_policies.append(policy_name)
        
        # Sort + de-dupe overlaps
        all_matches.sort(key=lambda x: (x[0], x[1]))
        matches = []
        last_end = -1
        for start, end, span, policy, action in all_matches:
            if start >= last_end:
                matches.append((start, end, span, policy, action))
                last_end = end
        
        # Build annotations
        annotations = [
            Annotation(span=span, policy_name=policy, action=action, start=start, end=end)
            for start, end, span, policy, action in matches
        ]
        
        # Determine verdict based on actions
        if any(a.action == "BLOCK" for a in annotations):
            verdict = "BLOCKED"
            user_message = "This request was blocked due to potential prompt injection."
            governed_output = "I cannot fulfill this request. It appears to be attempting to override my instructions."
        elif annotations:
            verdict = "REDACTED"
            user_message = "Output has been redacted to remove sensitive information."
            # Apply redactions from end -> start to avoid index drift
            for start, end, span, policy, action in sorted(matches, key=lambda x: x[0], reverse=True):
                if action == "REDACT":
                    # Simple redaction - replace matched span with [REDACTED]
                    governed_output = governed_output[:start] + "[REDACTED]" + governed_output[end:]
        
        # Generate events
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content)}},
            {"event_type": "Policy Evaluated", "payload": {"policies": evaluated_policies}},
        ]
        
        if annotations:
            violations = {}
            for ann in annotations:
                if ann.policy_name not in violations:
                    violations[ann.policy_name] = 0
                violations[ann.policy_name] += 1
            
            for policy_name, count in violations.items():
                events.append({
                    "event_type": "Violation Detected",
                    "payload": {"policy": policy_name, "matches": count}
                })
            
            redact_count = sum(1 for a in annotations if a.action == "REDACT")
            if redact_count > 0:
                events.append({
                    "event_type": "Action Applied",
                    "payload": {"action": "REDACT", "redactions": redact_count}
                })
            
            if any(a.action == "BLOCK" for a in annotations):
                events.append({
                    "event_type": "Action Applied",
                    "payload": {"action": "BLOCK"}
                })
        
        events.append({
            "event_type": "Final Output Released",
            "payload": {"verdict": verdict}
        })
        
        return {
            "baseline_output": baseline_output,
            "governed_output": governed_output,
            "verdict": verdict,
            "user_message": user_message,
            "annotations": annotations,
            "events": events,
        }
    
    # Explicit scenario handling (only when scenario_id is provided)
    # Even for explicit scenarios, use policies from Supabase (no hardcoded policy names)
    if scenario_id:
        # Load policies from Supabase (no caching - fresh on each run)
        policies = load_policies(policy_pack_version)
        
        evaluated_policies = []
        all_matches = []
        
        # Evaluate each enabled policy that matches the input_type scope
        for policy in policies:
            if input_type not in policy["scope"]:
                continue  # Skip policies that don't apply to this input type
            
            policy_id = policy["id"]
            policy_name = policy["name"]
            policy_action = policy["action"]
            conditions = policy.get("conditions", {})
            
            # Get regex patterns from conditions.patterns (list of regex strings)
            regex_patterns = conditions.get("patterns", [])
            
            # Debug: Log policy evaluation details before matching
            conditions_keys = list(conditions.keys())
            patterns_preview = regex_patterns[:3] if len(regex_patterns) > 0 else []
            matching_method = "regex"  # Always using regex for patterns
            
            debug_info = {
                "policy_id": policy_id,
                "policy_name": policy_name,
                "conditions_keys": conditions_keys,
                "patterns_preview": patterns_preview,
                "patterns_count": len(regex_patterns),
                "matching_method": matching_method,
                "input_type": input_type,
                "input_length": len(input_content),
                "scenario_id": scenario_id
            }
            print(f"[POLICY_EVAL] {json.dumps(debug_info)}")
            
            # Evaluate each pattern for this policy using regex (re.finditer)
            for pattern_str in regex_patterns:
                try:
                    # Use re.finditer for regex pattern matching (not substring matching)
                    for match in re.finditer(pattern_str, input_content, re.IGNORECASE):
                        start, end = match.span()
                        all_matches.append((start, end, match.group(), policy_name, policy_action))
                except re.error as e:
                    # Log pattern errors but continue
                    print(f"Warning: Invalid regex pattern in policy {policy_name}: {pattern_str} - {e}")
            
            # Check if this policy had any matches
            if any(p[3] == policy_name for p in all_matches):
                evaluated_policies.append(policy_name)
        
        # Sort + de-dupe overlaps
        all_matches.sort(key=lambda x: (x[0], x[1]))
        matches = []
        last_end = -1
        for start, end, span, policy, action in all_matches:
            if start >= last_end:
                matches.append((start, end, span, policy, action))
                last_end = end
        
        # Build annotations
        annotations = [
            Annotation(span=span, policy_name=policy, action=action, start=start, end=end)
            for start, end, span, policy, action in matches
        ]
        
        # Determine verdict based on actions
        if any(a.action == "BLOCK" for a in annotations):
            verdict = "BLOCKED"
            user_message = "This request was blocked due to potential prompt injection."
            governed_output = "I cannot fulfill this request. It appears to be attempting to override my instructions."
        elif annotations:
            verdict = "REDACTED"
            user_message = "Output has been redacted to remove sensitive information."
            # Apply redactions from end -> start to avoid index drift
            for start, end, span, policy, action in sorted(matches, key=lambda x: x[0], reverse=True):
                if action == "REDACT":
                    governed_output = governed_output[:start] + "[REDACTED]" + governed_output[end:]
        
        # Generate events using policy names from DB
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content)}},
            {"event_type": "Policy Evaluated", "payload": {"policies": evaluated_policies}},
        ]
        
        if annotations:
            violations = {}
            for ann in annotations:
                if ann.policy_name not in violations:
                    violations[ann.policy_name] = 0
                violations[ann.policy_name] += 1
            
            for policy_name, count in violations.items():
                events.append({
                    "event_type": "Violation Detected",
                    "payload": {"policy": policy_name, "matches": count}
                })
            
            redact_count = sum(1 for a in annotations if a.action == "REDACT")
            if redact_count > 0:
                events.append({
                    "event_type": "Action Applied",
                    "payload": {"action": "REDACT", "redactions": redact_count}
                })
            
            if any(a.action == "BLOCK" for a in annotations):
                events.append({
                    "event_type": "Action Applied",
                    "payload": {"action": "BLOCK"}
                })
        
        events.append({
            "event_type": "Final Output Released",
            "payload": {"verdict": verdict}
        })
    
    return {
        "baseline_output": baseline_output,
        "governed_output": governed_output,
        "verdict": verdict,
        "user_message": user_message,
        "annotations": annotations,
        "events": events,
    }


@app.post("/v1/runs", response_model=CreateRunResponse)
async def create_run(request: CreateRunRequest):
    """Create a new run and generate stub results"""
    run_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    policy_pack_version = "v1"
    
    # Generate demo results (loads policies from Supabase when scenario_id is None)
    result = generate_demo_run(request.input_type, request.input_content, request.scenario_id, policy_pack_version)
    
    # Create input preview (first 100 chars)
    input_preview = request.input_content[:100] + ("..." if len(request.input_content) > 100 else "")
    
    # Insert run
    run_data = {
        "id": run_id,
        "created_at": created_at,
        "input_type": request.input_type,
        "input_preview": input_preview,
        "input_content": request.input_content,
        "scenario_id": request.scenario_id,
        "verdict": result["verdict"],
        "baseline_output": result["baseline_output"],
        "governed_output": result["governed_output"],
        "user_message": result["user_message"],
        "policy_pack_version": "v1",
        "meta": {"annotations": [a.dict() for a in result["annotations"]]}
    }
    
    supabase.table("runs").insert(run_data).execute()
    
    # Insert events
    events_data = []
    for seq, event in enumerate(result["events"], start=1):
        events_data.append({
            "run_id": run_id,
            "ts": created_at,
            "seq": seq,
            "event_type": event["event_type"],
            "payload": event["payload"]
        })
    
    if events_data:
        supabase.table("run_events").insert(events_data).execute()
    
    return CreateRunResponse(
        run_id=run_id,
        verdict=result["verdict"],
        user_message=result["user_message"],
        baseline_output=result["baseline_output"],
        governed_output=result["governed_output"],
        annotations=result["annotations"]
    )


@app.get("/v1/runs/{run_id}", response_model=GetRunResponse)
async def get_run(run_id: str):
    """Get run details with events and annotations"""
    # Fetch run
    run_result = supabase.table("runs").select("*").eq("id", run_id).execute()
    if not run_result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run_data = run_result.data[0]
    run = Run(**run_data)
    
    # Fetch events
    events_result = supabase.table("run_events").select("*").eq("run_id", run_id).order("seq").execute()
    events = [RunEvent(**e) for e in events_result.data]
    
    # Load stored annotations from run.meta (immutability)
    meta = run.meta or {}
    stored = meta.get("annotations", [])
    annotations = [Annotation(**a) for a in stored]

    
    return GetRunResponse(run=run, events=events, annotations=annotations)


@app.get("/v1/runs/{run_id}/export", response_model=ExportResponse)
async def export_run(run_id: str):
    """Export full run data with policy snapshot"""
    # Get run and events
    run_result = supabase.table("runs").select("*").eq("id", run_id).execute()
    if not run_result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run_data = run_result.data[0]
    run = Run(**run_data)
    # Load stored annotations from run.meta
    meta = run.meta or {}
    annotations = meta.get("annotations", [])

    
    events_result = supabase.table("run_events").select("*").eq("run_id", run_id).order("seq").execute()
    events = [RunEvent(**e) for e in events_result.data]
    
    # Extract evaluated policy names from events
    evaluated_policy_names = set()
    for event in events:
        if event.event_type == "Policy Evaluated":
            policy_list = event.payload.get("policies", [])
            evaluated_policy_names.update(policy_list)
    
    # Get all policies, but filter to only those that were actually evaluated
    policies_result = supabase.table("policies").select("*").execute()
    all_policies = [Policy(**p) for p in policies_result.data]
    
    # Filter to only policies that were evaluated (match by name)
    evaluated_policies = [p for p in all_policies if p.name in evaluated_policy_names]
    
    # If no evaluated policies found in events, fall back to all policies (for backward compatibility)
    if not evaluated_policies:
        evaluated_policies = all_policies
    
    # SIEM payload preview
    siem_payload = {
        "run_id": run.id,
        "timestamp": run.created_at,
        "verdict": run.verdict,
        "input_type": run.input_type,
        "policy_pack_version": run.policy_pack_version,
        "event_count": len(events),
        "violations": [e for e in events if e.event_type == "Violation Detected"]
    }
    
    return ExportResponse(
        run=run,
        events=events,
        policy_snapshot={
            "policy_pack_version": run.policy_pack_version,
            "policies": [p.dict() for p in evaluated_policies],
            "annotations": annotations
        },
        siem_payload_preview=siem_payload
    )


@app.get("/v1/policies", response_model=GetPoliciesResponse)
async def get_policies():
    """Get all policies"""
    policies_result = supabase.table("policies").select("*").execute()
    policies = [Policy(**p) for p in policies_result.data]
    
    return GetPoliciesResponse(
        policy_pack_version="v1",
        policies=policies
    )


@app.get("/v1/debug/policy-pack")
async def debug_policy_pack(policy_pack_version: str = "v1"):
    """Debug endpoint to show exact policy pack used for evaluation"""
    policies = load_policies(policy_pack_version)
    
    # Format for debugging
    debug_info = {
        "policy_pack_version": policy_pack_version,
        "policies": []
    }
    
    for policy in policies:
        debug_info["policies"].append({
            "id": policy["id"],
            "name": policy["name"],
            "scope": policy["scope"],
            "status": policy["status"],
            "version": policy["version"],
            "action": policy["action"],
            "conditions": policy["conditions"],
            "patterns": policy["conditions"].get("patterns", []),
            "keywords": policy["conditions"].get("keywords", []),
        })
    
    return debug_info


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "demo_mode": demo_mode, "api_build": API_BUILD}

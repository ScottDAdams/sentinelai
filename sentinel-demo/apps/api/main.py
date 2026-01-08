"""
Sentinel Demo API - FastAPI Backend
"""
import os
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

app = FastAPI(title="Sentinel Demo API", version="1.0.0")

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
def generate_demo_run(input_type: str, input_content: str, scenario_id: Optional[str] = None):
    """Generate deterministic demo run results based on scenario"""
    
    # Determine scenario from scenario_id or heuristics
    if not scenario_id:
        content_lower = input_content.lower()
        if any(x in content_lower for x in ['ssn', 'social security', 'phone', '555-']):
            scenario_id = 'pii_chat'
        elif any(x in content_lower for x in ['salary', 'compensation', 'csv']):
            scenario_id = 'file_comp'
        elif any(x in content_lower for x in ['api_key', 'apiKey', 'secret', 'password']):
            scenario_id = 'code_secret'
        elif any(x in content_lower for x in ['ignore', 'forget', 'reveal', 'show me']):
            scenario_id = 'injection'
        else:
            scenario_id = 'pii_chat'  # default
    
    annotations = []
    events = []
    baseline_output = ""
    governed_output = ""
    verdict = "SHIPPABLE"
    user_message = "Output is ready to ship."
    
    if scenario_id == 'pii_chat':
        # PII Chat scenario
        baseline_output = input_content
        governed_output = input_content
        
        # Find and redact SSN + phone (apply from end -> start to avoid index drift)
        import re

        text = input_content
        governed_output = text

        ssn_pattern = r"\b\d{3}-\d{2}-\d{4}\b"
        phone_pattern = r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"

        raw_matches = []
        for m in re.finditer(ssn_pattern, text):
            raw_matches.append((m.start(), m.end(), m.group(), "Sensitive Data Policy", "REDACT"))
        for m in re.finditer(phone_pattern, text):
            raw_matches.append((m.start(), m.end(), m.group(), "Sensitive Data Policy", "REDACT"))

        # Sort + de-dupe overlaps
        raw_matches.sort(key=lambda x: (x[0], x[1]))
        matches = []
        last_end = -1
        for start, end, span, policy, action in raw_matches:
            if start >= last_end:
                matches.append((start, end, span, policy, action))
                last_end = end

        # Build annotations from original indices
        annotations = [
            Annotation(span=span, policy_name=policy, action=action, start=start, end=end)
            for start, end, span, policy, action in matches
        ]
        if annotations:
            verdict = "REDACTED"
            user_message = "Output has been redacted to remove sensitive information."
        else:
            verdict = "SHIPPABLE"
            user_message = "Output is ready to ship."


        # Apply replacements from end -> start
        for start, end, span, policy, action in sorted(matches, key=lambda x: x[0], reverse=True):
            governed_output = governed_output[:start] + "[REDACTED]" + governed_output[end:]

        
        # Events
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content)}},
            {"event_type": "Policy Evaluated", "payload": {"policies": ["Sensitive Data Policy"]}},
            {"event_type": "Violation Detected", "payload": {"policy": "Sensitive Data Policy", "matches": len(annotations)}},
            {"event_type": "Action Applied", "payload": {"action": "REDACT", "redactions": len(annotations)}},
            {"event_type": "Final Output Released", "payload": {"verdict": verdict}},
        ]
    
    elif scenario_id == 'file_comp':
        # Compensation file scenario
        baseline_output = input_content
        governed_output = input_content
        
        # Simple heuristic: if CSV-like, summarize
        if ',' in input_content or '\t' in input_content:
            lines = input_content.split('\n')
            if len(lines) > 1:
                # Assume header + data rows
                header = lines[0]
                data_rows = lines[1:]
                
                baseline_output = input_content
                
                # Create summary (remove names, aggregate)
                summary_lines = [header]
                summary_lines.append("Summary: Total records processed. Individual salaries redacted.")
                summary_lines.append("Aggregate statistics available upon request.")
                
                governed_output = '\n'.join(summary_lines)
                
                # Annotate original content
                annotations.append(Annotation(
                    span="Individual salary data",
                    policy_name="Confidential File Policy",
                    action="REDACT",
                    start=len(header) + 1,
                    end=len(input_content)
                ))
                
                verdict = "REDACTED"
                user_message = "File content has been summarized. Individual compensation data has been redacted."
        
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content), "file_type": "csv"}},
            {"event_type": "Policy Evaluated", "payload": {"policies": ["Confidential File Policy"]}},
            {"event_type": "Violation Detected", "payload": {"policy": "Confidential File Policy", "reason": "Contains confidential compensation data"}},
            {"event_type": "Action Applied", "payload": {"action": "REDACT", "method": "summarization"}},
            {"event_type": "Final Output Released", "payload": {"verdict": verdict}},
        ]
    
    elif scenario_id == 'code_secret':
        # Code secret scenario
        baseline_output = input_content
        governed_output = input_content
        
        # Find API keys, secrets
        import re
        key_patterns = [
            (r'api[_-]?key\s*[:=]\s*["\']?([a-zA-Z0-9_-]{20,})["\']?', 'api_key'),
            (r'secret\s*[:=]\s*["\']?([a-zA-Z0-9_-]{20,})["\']?', 'secret'),
            (r'password\s*[:=]\s*["\']?([^"\'\n]+)["\']?', 'password'),
        ]
        
        for pattern, key_type in key_patterns:
            for match in re.finditer(pattern, input_content, re.IGNORECASE):
                start, end = match.span()
                annotations.append(Annotation(
                    span=match.group(),
                    policy_name="Secrets Policy",
                    action="REDACT",
                    start=start,
                    end=end
                ))
                replacement = f"{match.group().split('=')[0] if '=' in match.group() else match.group().split(':')[0]}= [REDACTED]"
                governed_output = governed_output[:start] + replacement + governed_output[end:]
        
        if annotations:
            verdict = "REDACTED"
            user_message = "Secrets have been redacted. Please use environment variables for sensitive credentials."
        
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content)}},
            {"event_type": "Policy Evaluated", "payload": {"policies": ["Secrets Policy"]}},
            {"event_type": "Violation Detected", "payload": {"policy": "Secrets Policy", "matches": len(annotations)}},
            {"event_type": "Action Applied", "payload": {"action": "REDACT", "redactions": len(annotations)}},
            {"event_type": "Final Output Released", "payload": {"verdict": verdict}},
        ]
    
    elif scenario_id == 'injection':
        # Prompt injection scenario
        baseline_output = "I'll help you with that. Here are the policies: [FAKE POLICY LIST]"
        governed_output = "I cannot fulfill this request. It appears to be attempting to override my instructions."
        verdict = "BLOCKED"
        user_message = "This request was blocked due to potential prompt injection."
        
        annotations.append(Annotation(
            span=input_content[:50] + "...",
            policy_name="Prompt Injection Defense",
            action="BLOCK",
            start=0,
            end=len(input_content)
        ))
        
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content)}},
            {"event_type": "Policy Evaluated", "payload": {"policies": ["Prompt Injection Defense"]}},
            {"event_type": "Violation Detected", "payload": {"policy": "Prompt Injection Defense", "reason": "Suspicious instruction pattern"}},
            {"event_type": "Action Applied", "payload": {"action": "BLOCK"}},
            {"event_type": "Final Output Released", "payload": {"verdict": verdict}},
        ]
    
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
    
    # Generate demo results
    result = generate_demo_run(request.input_type, request.input_content, request.scenario_id)
    
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
    
    # Get policies
    policies_result = supabase.table("policies").select("*").execute()
    policies = [Policy(**p) for p in policies_result.data]
    
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
            "policies": [p.dict() for p in policies],
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


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "demo_mode": demo_mode}

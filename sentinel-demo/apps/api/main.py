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


def extract_value_span(matched_text: str, match_start: int, match_end: int):
    """
    Extract the value portion span from a KEY=VALUE or Header: Value match.
    Annotations should record only the VALUE portion, not the key name.
    
    Args:
        matched_text: The full matched text
        match_start: Start position of the full match
        match_end: End position of the full match
    
    Returns:
        Tuple of (value_start, value_end, value_span) representing just the value portion.
        If no delimiter found, returns original (match_start, match_end, matched_text).
    """
    # Check if matched text contains '=' (preferred) or ':' delimiter
    if '=' in matched_text:
        delimiter_idx = matched_text.find('=')
        value_start_in_match = delimiter_idx + 1
        # Skip any whitespace after '='
        while value_start_in_match < len(matched_text) and matched_text[value_start_in_match] in ' \t':
            value_start_in_match += 1
        value_span = matched_text[value_start_in_match:]
        value_start = match_start + value_start_in_match
        value_end = match_end
        return (value_start, value_end, value_span)
    elif ':' in matched_text:
        delimiter_idx = matched_text.find(':')
        value_start_in_match = delimiter_idx + 1
        # Skip any whitespace after ':'
        while value_start_in_match < len(matched_text) and matched_text[value_start_in_match] in ' \t':
            value_start_in_match += 1
        value_span = matched_text[value_start_in_match:]
        value_start = match_start + value_start_in_match
        value_end = match_end
        return (value_start, value_end, value_span)
    else:
        # No delimiter found, entire match is the value
        return (match_start, match_end, matched_text)


def apply_redaction(content: str, start: int, end: int, matched_text: str) -> str:
    """
    Apply redaction to content, preserving variable names for KEY=VALUE or KEY: VALUE formats.
    
    Args:
        content: The full content string
        start: Start position of the match (full match including key)
        end: End position of the match (full match including key)
        matched_text: The matched text span (full match including key)
    
    Returns:
        The content with redaction applied (preserves key name, redacts value)
    """
    # Check if matched text contains '=' (preferred) or ':' delimiter
    if '=' in matched_text:
        delimiter_idx = matched_text.find('=')
        # Keep variable name and delimiter, replace value
        replacement = matched_text[:delimiter_idx + 1] + "[REDACTED]"
    elif ':' in matched_text:
        delimiter_idx = matched_text.find(':')
        # Keep variable name and delimiter, replace value
        # Handle optional space after colon
        space_after_colon = 0
        if delimiter_idx + 1 < len(matched_text) and matched_text[delimiter_idx + 1] == ' ':
            space_after_colon = 1
        replacement = matched_text[:delimiter_idx + 1 + space_after_colon] + "[REDACTED]"
    else:
        # No delimiter found, replace entire span
        replacement = "[REDACTED]"
    
    return content[:start] + replacement + content[end:]


# Pydantic models (matching TypeScript types)
class Annotation(BaseModel):
    span: str
    policy_name: str
    action: str = Field(..., pattern="^(REDACT|BLOCK|REVIEW)$")
    start: int
    end: int


class CreateRunRequest(BaseModel):
    input_type: str = Field(..., pattern="^(chat|file|code|copilot)$")
    input_content: str
    scenario_id: Optional[str] = Field(None, pattern="^(pii_chat|file_comp|code_secret|injection)$")


class CreateRunResponse(BaseModel):
    run_id: str
    verdict: str = Field(..., pattern="^(SHIPPABLE|REDACTED|BLOCKED|REVIEW)$")
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


# Helper function to find JSON value position in original string
def find_json_value_position(json_str: str, json_obj: dict, field_path: str) -> Optional[tuple]:
    """
    Find the start and end position of a JSON value in the original JSON string.
    
    Args:
        json_str: The original JSON string
        json_obj: The parsed JSON object
        field_path: Dot-separated path to the field (e.g., "sensitivity_label", "user.department", "compliance_flags.0")
    
    Returns:
        Tuple of (start, end) positions, or None if not found
    """
    import re
    try:
        # Navigate to the field value to verify it exists
        parts = field_path.split('.')
        value = json_obj
        for part in parts:
            if isinstance(value, list):
                value = value[int(part)]
            else:
                value = value[part]
        
        # Build regex pattern to find the field path in JSON
        # For nested paths like "user.department", we need to find "user": {... "department": ...}
        if len(parts) == 1:
            # Simple case: top-level field
            field_name = parts[0]
            pattern = f'"{re.escape(field_name)}"\\s*:\\s*'
            match = re.search(pattern, json_str)
            if not match:
                return None
            match_start_pos = match.start()
            match_end_pos = match.end()
        else:
            # Nested case: find parent object, then field
            # For "user.department", search for "user": {... "department": ...}
            parent_field = parts[0]
            field_name = parts[-1]
            # Find parent object, then search within it for the field
            parent_pattern = f'"{re.escape(parent_field)}"\\s*:\\s*\\{{'
            parent_match = re.search(parent_pattern, json_str)
            if not parent_match:
                return None
            # Search for the field within the parent object
            parent_start = parent_match.end() - 1  # Include the opening brace
            # Find the matching closing brace for the parent object
            brace_count = 1
            parent_end = parent_start + 1
            while parent_end < len(json_str) and brace_count > 0:
                if json_str[parent_end] == '{':
                    brace_count += 1
                elif json_str[parent_end] == '}':
                    brace_count -= 1
                parent_end += 1
            # Search for field within parent object bounds
            pattern = f'"{re.escape(field_name)}"\\s*:\\s*'
            match = re.search(pattern, json_str[parent_start:parent_end])
            if not match:
                return None
            match_start_pos = parent_start + match.start()
            match_end_pos = parent_start + match.end()
        
        # Find the value after the colon
        value_start = match_end_pos
        # Skip whitespace
        while value_start < len(json_str) and json_str[value_start] in ' \t\n\r':
            value_start += 1
        
        if value_start >= len(json_str):
            return None
        
        # Parse forward to find the end of the value
        if json_str[value_start] == '"':
            # String value - find closing quote (handling escapes)
            end_quote = value_start + 1
            while end_quote < len(json_str):
                if json_str[end_quote] == '"' and json_str[end_quote - 1] != '\\':
                    return (value_start, end_quote + 1)
                elif json_str[end_quote] == '"' and json_str[end_quote - 1] == '\\' and json_str[end_quote - 2] == '\\':
                    # Double backslash before quote - this is the end
                    return (value_start, end_quote + 1)
                end_quote += 1
            return None
        elif json_str[value_start] == '[':
            # Array value - find matching bracket
            bracket_count = 1
            pos = value_start + 1
            while pos < len(json_str) and bracket_count > 0:
                if json_str[pos] == '[':
                    bracket_count += 1
                elif json_str[pos] == ']':
                    bracket_count -= 1
                pos += 1
            return (value_start, pos) if bracket_count == 0 else None
        elif json_str[value_start] == '{':
            # Object value - find matching brace
            brace_count = 1
            pos = value_start + 1
            while pos < len(json_str) and brace_count > 0:
                if json_str[pos] == '{':
                    brace_count += 1
                elif json_str[pos] == '}':
                    brace_count -= 1
                pos += 1
            return (value_start, pos) if brace_count == 0 else None
        else:
            # Primitive value (number, boolean, null) - find next comma, }, or ]
            pos = value_start
            while pos < len(json_str):
                if json_str[pos] in ',}]':
                    return (value_start, pos)
                pos += 1
            return (value_start, len(json_str))
    except (KeyError, IndexError, ValueError, TypeError) as e:
        return None


def evaluate_copilot_policies(json_content: str, policies: List[dict]) -> tuple:
    """
    Evaluate policies against structured copilot JSON fields.
    
    Args:
        json_content: The JSON string content
        policies: List of policy dictionaries from Supabase
    
    Returns:
        Tuple of (annotations, evaluated_policies, matches) where:
        - annotations: List of Annotation objects
        - evaluated_policies: List of policy names that were evaluated
        - matches: List of match tuples for redaction
    """
    try:
        copilot_data = json.loads(json_content)
    except json.JSONDecodeError:
        # Invalid JSON - return empty results
        return ([], [], [])
    
    annotations = []
    evaluated_policies = []
    matches = []  # (match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action)
    
    # Extract structured fields from copilot data
    sensitivity_label = copilot_data.get("sensitivity_label", "")
    workload = copilot_data.get("workload", "")
    compliance_flags = copilot_data.get("compliance_flags", [])
    user_department = copilot_data.get("user", {}).get("department", "")
    user_role = copilot_data.get("user", {}).get("role", "")
    action_type = copilot_data.get("action", {}).get("type", "")
    
    # Evaluate each policy
    for policy in policies:
        policy_id = policy["id"]
        policy_name = policy["name"]
        policy_action = policy["action"]
        conditions = policy.get("conditions", {})
        
        # Get structured field conditions
        labels = conditions.get("labels", [])  # List of sensitivity labels to match
        workloads = conditions.get("workloads", [])  # List of workloads to match
        keywords = conditions.get("keywords", [])  # List of keywords to match against compliance_flags or other fields
        sensitivity_label_contains = conditions.get("sensitivity_label_contains", [])  # List of strings to check in sensitivity_label
        compliance_flags_include = conditions.get("compliance_flags_include", [])  # List of flags to check in compliance_flags
        
        policy_matched = False
        
        # Debug logging
        debug_info = {
            "policy_id": policy_id,
            "policy_name": policy_name,
            "conditions_keys": list(conditions.keys()),
            "matching_method": "structured_fields",
            "input_type": "copilot",
            "input_length": len(json_content),
            "sensitivity_label": sensitivity_label,
            "workload": workload,
            "compliance_flags": compliance_flags
        }
        print(f"[POLICY_EVAL] {json.dumps(debug_info)}")
        
        # Check sensitivity label match (using labels condition)
        if labels and sensitivity_label:
            for label_pattern in labels:
                if label_pattern.lower() in sensitivity_label.lower():
                    # Find position of sensitivity_label value
                    pos = find_json_value_position(json_content, copilot_data, "sensitivity_label")
                    if pos:
                        match_start, match_end = pos
                        matched_text = json_content[match_start:match_end]
                        # For JSON string values, extract just the value portion (without quotes)
                        if matched_text.startswith('"') and matched_text.endswith('"'):
                            value_start = match_start + 1
                            value_end = match_end - 1
                            value_span = matched_text[1:-1]
                        else:
                            value_start = match_start
                            value_end = match_end
                            value_span = matched_text
                        
                        matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                        policy_matched = True
                    break
        
        # Check sensitivity_label_contains condition (for policies like Sensitivity Label Guard)
        if sensitivity_label_contains and sensitivity_label:
            for pattern in sensitivity_label_contains:
                if pattern.lower() in sensitivity_label.lower():
                    # Find position of sensitivity_label value
                    pos = find_json_value_position(json_content, copilot_data, "sensitivity_label")
                    if pos:
                        match_start, match_end = pos
                        matched_text = json_content[match_start:match_end]
                        if matched_text.startswith('"') and matched_text.endswith('"'):
                            value_start = match_start + 1
                            value_end = match_end - 1
                            value_span = matched_text[1:-1]
                        else:
                            value_start = match_start
                            value_end = match_end
                            value_span = matched_text
                        
                        matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                        policy_matched = True
                        break
        
        # Check compliance_flags_include condition (for policies like Sensitivity Label Guard)
        if compliance_flags_include and compliance_flags:
            for required_flag in compliance_flags_include:
                if required_flag.lower() in [flag.lower() for flag in compliance_flags]:
                    # Find the matching flag in the array
                    matching_flag = next((f for f in compliance_flags if required_flag.lower() in f.lower()), None)
                    if matching_flag:
                        flag_index = compliance_flags.index(matching_flag)
                        field_path = f"compliance_flags.{flag_index}"
                        pos = find_json_value_position(json_content, copilot_data, field_path)
                        if pos:
                            match_start, match_end = pos
                            matched_text = json_content[match_start:match_end]
                            if matched_text.startswith('"') and matched_text.endswith('"'):
                                value_start = match_start + 1
                                value_end = match_end - 1
                                value_span = matched_text[1:-1]
                            else:
                                value_start = match_start
                                value_end = match_end
                                value_span = matched_text
                            
                            matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                            policy_matched = True
                            break
        
        # Check workload match
        if workloads and workload:
            for workload_pattern in workloads:
                if workload_pattern.lower() in workload.lower():
                    pos = find_json_value_position(json_content, copilot_data, "workload")
                    if pos:
                        match_start, match_end = pos
                        matched_text = json_content[match_start:match_end]
                        if matched_text.startswith('"') and matched_text.endswith('"'):
                            value_start = match_start + 1
                            value_end = match_end - 1
                            value_span = matched_text[1:-1]
                        else:
                            value_start = match_start
                            value_end = match_end
                            value_span = matched_text
                        
                        matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                        policy_matched = True
                    break
        
        # Check keyword matches in compliance_flags
        if keywords and compliance_flags:
            for keyword in keywords:
                if keyword.lower() in [flag.lower() for flag in compliance_flags]:
                    # Find the matching flag in the array
                    matching_flag = next((f for f in compliance_flags if keyword.lower() in f.lower()), None)
                    if matching_flag:
                        # Find position in compliance_flags array
                        flag_index = compliance_flags.index(matching_flag)
                        field_path = f"compliance_flags.{flag_index}"
                        pos = find_json_value_position(json_content, copilot_data, field_path)
                        if pos:
                            match_start, match_end = pos
                            matched_text = json_content[match_start:match_end]
                            if matched_text.startswith('"') and matched_text.endswith('"'):
                                value_start = match_start + 1
                                value_end = match_end - 1
                                value_span = matched_text[1:-1]
                            else:
                                value_start = match_start
                                value_end = match_end
                                value_span = matched_text
                            
                            matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                            policy_matched = True
        
        # Check keyword matches in other fields (user.department, user.role, action.type)
        if keywords:
            # Check user.department
            if user_department and any(kw.lower() in user_department.lower() for kw in keywords):
                pos = find_json_value_position(json_content, copilot_data, "user.department")
                if pos:
                    match_start, match_end = pos
                    matched_text = json_content[match_start:match_end]
                    if matched_text.startswith('"') and matched_text.endswith('"'):
                        value_start = match_start + 1
                        value_end = match_end - 1
                        value_span = matched_text[1:-1]
                    else:
                        value_start = match_start
                        value_end = match_end
                        value_span = matched_text
                    
                    matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                    policy_matched = True
            
            # Check user.role
            if user_role and any(kw.lower() in user_role.lower() for kw in keywords):
                pos = find_json_value_position(json_content, copilot_data, "user.role")
                if pos:
                    match_start, match_end = pos
                    matched_text = json_content[match_start:match_end]
                    if matched_text.startswith('"') and matched_text.endswith('"'):
                        value_start = match_start + 1
                        value_end = match_end - 1
                        value_span = matched_text[1:-1]
                    else:
                        value_start = match_start
                        value_end = match_end
                        value_span = matched_text
                    
                    matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                    policy_matched = True
            
            # Check action.request (for copilot interactions)
            action_request = copilot_data.get("action", {}).get("request", "")
            if action_request and any(kw.lower() in action_request.lower() for kw in keywords):
                pos = find_json_value_position(json_content, copilot_data, "action.request")
                if pos:
                    match_start, match_end = pos
                    matched_text = json_content[match_start:match_end]
                    if matched_text.startswith('"') and matched_text.endswith('"'):
                        value_start = match_start + 1
                        value_end = match_end - 1
                        value_span = matched_text[1:-1]
                    else:
                        value_start = match_start
                        value_end = match_end
                        value_span = matched_text
                    
                    matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                    policy_matched = True
            
            # Check content_preview
            content_preview = copilot_data.get("content_preview", "")
            if content_preview and any(kw.lower() in content_preview.lower() for kw in keywords):
                pos = find_json_value_position(json_content, copilot_data, "content_preview")
                if pos:
                    match_start, match_end = pos
                    matched_text = json_content[match_start:match_end]
                    if matched_text.startswith('"') and matched_text.endswith('"'):
                        value_start = match_start + 1
                        value_end = match_end - 1
                        value_span = matched_text[1:-1]
                    else:
                        value_start = match_start
                        value_end = match_end
                        value_span = matched_text
                    
                    matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                    policy_matched = True
        
        if policy_matched:
            evaluated_policies.append(policy_name)
    
    # Build annotations from matches
    annotations = [
        Annotation(span=value_span, policy_name=policy, action=action, start=value_start, end=value_end)
        for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in matches
    ]
    
    return (annotations, evaluated_policies, matches)


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
    
    # Special handling for copilot input type - evaluate structured fields
    if input_type == "copilot":
        # Load policies from Supabase
        policies = load_policies(policy_pack_version)
        
        # Filter policies that apply to copilot input type
        # Ensure scope is treated as a list (handle both list and string formats)
        copilot_policies = []
        for p in policies:
            scope = p.get("scope", [])
            # Handle case where scope might be stored as a string or list
            if isinstance(scope, str):
                scope = [scope]
            if input_type in scope:
                copilot_policies.append(p)
        
        # Log policy filtering for debugging
        print(f"[POLICY_FILTER] input_type='{input_type}', total_policies={len(policies)}, applicable_policies={len(copilot_policies)}")
        if copilot_policies:
            print(f"[POLICY_FILTER] applicable_policy_names={[p['name'] for p in copilot_policies]}")
        
        # Evaluate policies against structured fields
        annotations, evaluated_policies, matches = evaluate_copilot_policies(input_content, copilot_policies)
        
        # Determine verdict based on actions (priority: BLOCK > REVIEW > REDACT)
        if any(a.action == "BLOCK" for a in annotations):
            verdict = "BLOCKED"
            user_message = "This request was blocked due to policy violation."
            governed_output = json.dumps({"error": "Request blocked by policy", "reason": "Policy violation detected"})
        elif any(a.action == "REVIEW" for a in annotations):
            verdict = "REVIEW"
            user_message = "This content requires manual review before release."
            # Replace governed_output with held message (do not echo original content)
            review_policies = [a.policy_name for a in annotations if a.action == "REVIEW"]
            governed_output = f"This content is held for review due to policy: {', '.join(set(review_policies))}."
        elif annotations:
            verdict = "REDACTED"
            user_message = "Output has been redacted to remove sensitive information."
            # Apply redactions from end -> start to avoid index drift
            for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in sorted(matches, key=lambda x: x[0], reverse=True):
                if action == "REDACT":
                    # For JSON, check if the value is a string (has quotes) and maintain JSON structure
                    if matched_text.startswith('"') and matched_text.endswith('"'):
                        # String value - replace with "[REDACTED]" to maintain valid JSON
                        governed_output = governed_output[:match_start] + '"[REDACTED]"' + governed_output[match_end:]
                    else:
                        # Non-string value - replace value portion only
                        governed_output = governed_output[:value_start] + "[REDACTED]" + governed_output[value_end:]
        
        # Generate events (same structure as other input types)
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content)}},
            {"event_type": "Policy Evaluated", "payload": {"policies": evaluated_policies}},
        ]
        
        # Track review reasons for meta field
        review_reasons = []
        
        if annotations:
            violations = {}
            violation_reasons = {}  # Track why each policy triggered
            
            for ann in annotations:
                if ann.policy_name not in violations:
                    violations[ann.policy_name] = 0
                    violation_reasons[ann.policy_name] = []
                violations[ann.policy_name] += 1
                
                # Track review reasons
                if ann.action == "REVIEW":
                    # Find policy ID from copilot_policies list
                    policy_id = None
                    for p in copilot_policies:
                        if p["name"] == ann.policy_name:
                            policy_id = p["id"]
                            break
                    review_reasons.append({
                        "policy_id": policy_id or "unknown",
                        "policy_name": ann.policy_name,
                        "matches": 1  # Will be aggregated below
                    })
                
                # For Sensitivity Label Guard, add reason to payload
                if ann.policy_name == "Sensitivity Label Guard":
                    # Try to determine why it triggered from the annotation span
                    if "Confidential" in ann.span:
                        violation_reasons[ann.policy_name].append("sensitivity_label_contains_confidential")
                    elif ann.span in ["financial_data", "executive_discussion"]:
                        violation_reasons[ann.policy_name].append(f"compliance_flag_{ann.span}")
            
            # Aggregate review reasons by policy
            review_reasons_aggregated = {}
            for reason in review_reasons:
                key = reason["policy_id"]
                if key not in review_reasons_aggregated:
                    review_reasons_aggregated[key] = {
                        "policy_id": reason["policy_id"],
                        "policy_name": reason["policy_name"],
                        "matches": 0
                    }
                review_reasons_aggregated[key]["matches"] += 1
            
            for policy_name, count in violations.items():
                payload = {"policy": policy_name, "matches": count}
                # Add reason for Sensitivity Label Guard
                if policy_name == "Sensitivity Label Guard" and violation_reasons[policy_name]:
                    payload["triggered_by"] = list(set(violation_reasons[policy_name]))
                events.append({
                    "event_type": "Violation Detected",
                    "payload": payload
                })
            
            redact_count = sum(1 for a in annotations if a.action == "REDACT")
            if redact_count > 0:
                events.append({
                    "event_type": "Action Applied",
                    "payload": {"action": "REDACT", "redactions": redact_count}
                })
            
            review_count = sum(1 for a in annotations if a.action == "REVIEW")
            if review_count > 0:
                events.append({
                    "event_type": "Action Applied",
                    "payload": {"action": "REVIEW", "reviews": review_count}
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
        
        # Build meta with review information
        meta = {
            "annotations": [a.dict() for a in annotations],
            "review_required": verdict == "REVIEW",
        }
        if review_reasons_aggregated:
            meta["review_reasons"] = list(review_reasons_aggregated.values())
        
        return {
            "baseline_output": baseline_output,
            "governed_output": governed_output,
            "verdict": verdict,
            "user_message": user_message,
            "annotations": annotations,
            "events": events,
            "meta": meta,
        }
    
    # If no scenario_id provided, evaluate all policies from Supabase based on their patterns
    if not scenario_id:
        # Load policies from Supabase (no caching - fresh on each run)
        policies = load_policies(policy_pack_version)
        
        # Filter policies by scope - ensure copilot is treated as first-class input type
        applicable_policies = []
        for policy in policies:
            scope = policy.get("scope", [])
            # Handle case where scope might be stored as a string or list
            if isinstance(scope, str):
                scope = [scope]
            if input_type in scope:
                applicable_policies.append(policy)
        
        # Log policy filtering for debugging
        print(f"[POLICY_FILTER] input_type='{input_type}', total_policies={len(policies)}, applicable_policies={len(applicable_policies)}")
        if applicable_policies:
            print(f"[POLICY_FILTER] applicable_policy_names={[p['name'] for p in applicable_policies]}")
        
        evaluated_policies = []
        all_matches = []
        
        # Evaluate each enabled policy that matches the input_type scope
        for policy in applicable_policies:
            
            policy_id = policy["id"]
            policy_name = policy["name"]
            policy_action = policy["action"]
            conditions = policy.get("conditions", {})
            
            # Get regex patterns from conditions.patterns (list of regex strings)
            regex_patterns = conditions.get("patterns", [])
            # Get keywords from conditions.keywords (for keyword-based matching)
            keywords = conditions.get("keywords", [])
            
            # Debug: Log policy evaluation details before matching
            conditions_keys = list(conditions.keys())
            patterns_preview = regex_patterns[:3] if len(regex_patterns) > 0 else []
            matching_method = "regex" if regex_patterns else ("keywords" if keywords else "none")
            
            debug_info = {
                "policy_id": policy_id,
                "policy_name": policy_name,
                "conditions_keys": conditions_keys,
                "patterns_preview": patterns_preview,
                "patterns_count": len(regex_patterns),
                "keywords_count": len(keywords),
                "matching_method": matching_method,
                "input_type": input_type,
                "input_length": len(input_content)
            }
            print(f"[POLICY_EVAL] {json.dumps(debug_info)}")
            
            # Evaluate keywords first (for chat/copilot inputs that use keyword matching)
            if keywords and input_type in ["chat", "copilot"]:
                input_lower = input_content.lower()
                for keyword in keywords:
                    keyword_lower = keyword.lower()
                    if keyword_lower in input_lower:
                        # Find all occurrences of the keyword
                        start_pos = 0
                        while True:
                            idx = input_lower.find(keyword_lower, start_pos)
                            if idx == -1:
                                break
                            match_start = idx
                            match_end = idx + len(keyword)
                            matched_text = input_content[match_start:match_end]
                            # For keyword matches, the entire keyword is the value
                            value_start, value_end, value_span = match_start, match_end, matched_text
                            all_matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                            start_pos = idx + 1
            
            # Evaluate each pattern for this policy using regex (re.finditer)
            for pattern_str in regex_patterns:
                try:
                    # Use re.finditer for regex pattern matching (not substring matching)
                    for match in re.finditer(pattern_str, input_content, re.IGNORECASE):
                        match_start, match_end = match.span()
                        matched_text = match.group()
                        
                        # Extract value portion for annotation (records only the value, not the key)
                        value_start, value_end, value_span = extract_value_span(matched_text, match_start, match_end)
                        
                        # Store: (match_start, match_end, matched_text_full, value_start, value_end, value_span, policy_name, policy_action)
                        # match_start/end and matched_text needed for redaction (preserves key name)
                        # value_start/end/span needed for annotation (records only value for UI highlighting)
                        all_matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                except re.error as e:
                    # Log pattern errors but continue
                    print(f"Warning: Invalid regex pattern in policy {policy_name}: {pattern_str} - {e}")
            
            # Check if this policy had any matches
            if any(p[6] == policy_name for p in all_matches):
                evaluated_policies.append(policy_name)
        
        # Sort + de-dupe overlaps (based on value portion to avoid overlapping annotations)
        all_matches.sort(key=lambda x: (x[3], x[4]))  # Sort by value_start, value_end
        matches = []
        last_value_end = -1
        for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in all_matches:
            if value_start >= last_value_end:
                matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy, action))
                last_value_end = value_end
        
        # Build annotations using VALUE portion only (for UI highlighting and SIEM export)
        # Each annotation records: policy_name, action, start, end, span (all for VALUE portion)
        annotations = [
            Annotation(span=value_span, policy_name=policy, action=action, start=value_start, end=value_end)
            for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in matches
        ]
        
        # Determine verdict based on actions (priority: BLOCK > REVIEW > REDACT)
        if any(a.action == "BLOCK" for a in annotations):
            verdict = "BLOCKED"
            user_message = "This request was blocked due to potential prompt injection."
            governed_output = "I cannot fulfill this request. It appears to be attempting to override my instructions."
        elif any(a.action == "REVIEW" for a in annotations):
            verdict = "REVIEW"
            user_message = "This content requires manual review before release."
            # Replace governed_output with held message (do not echo original content)
            review_policies = [a.policy_name for a in annotations if a.action == "REVIEW"]
            governed_output = f"This content is held for review due to policy: {', '.join(set(review_policies))}."
        elif annotations:
            verdict = "REDACTED"
            user_message = "Output has been redacted to remove sensitive information."
            # Apply redactions from end -> start to avoid index drift
            # Use full match info (match_start, match_end, matched_text) for redaction (preserves key name)
            for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in sorted(matches, key=lambda x: x[0], reverse=True):
                if action == "REDACT":
                    # Preserve variable names for KEY=VALUE or KEY: VALUE formats
                    governed_output = apply_redaction(governed_output, match_start, match_end, matched_text)
        
        # Generate events
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content)}},
            {"event_type": "Policy Evaluated", "payload": {"policies": evaluated_policies}},
        ]
        
        # Track review reasons for meta field
        review_reasons = []
        
        if annotations:
            violations = {}
            for ann in annotations:
                if ann.policy_name not in violations:
                    violations[ann.policy_name] = 0
                violations[ann.policy_name] += 1
                
                # Track review reasons
                if ann.action == "REVIEW":
                    # Find policy ID from applicable_policies list
                    policy_id = None
                    for p in applicable_policies:
                        if p["name"] == ann.policy_name:
                            policy_id = p["id"]
                            break
                    review_reasons.append({
                        "policy_id": policy_id or "unknown",
                        "policy_name": ann.policy_name,
                        "matches": 1  # Will be aggregated below
                    })
            
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
            
            review_count = sum(1 for a in annotations if a.action == "REVIEW")
            if review_count > 0:
                events.append({
                    "event_type": "Action Applied",
                    "payload": {"action": "REVIEW", "reviews": review_count}
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
        
        # Build meta with review information
        review_reasons_aggregated = {}
        for reason in review_reasons:
            key = reason["policy_id"]
            if key not in review_reasons_aggregated:
                review_reasons_aggregated[key] = {
                    "policy_id": reason["policy_id"],
                    "policy_name": reason["policy_name"],
                    "matches": 0
                }
            review_reasons_aggregated[key]["matches"] += 1
        
        meta = {
            "annotations": [a.dict() for a in annotations],
            "review_required": verdict == "REVIEW",
        }
        if review_reasons_aggregated:
            meta["review_reasons"] = list(review_reasons_aggregated.values())
        
        return {
            "baseline_output": baseline_output,
            "governed_output": governed_output,
            "verdict": verdict,
            "user_message": user_message,
            "annotations": annotations,
            "events": events,
            "meta": meta,
        }
    
    # Explicit scenario handling (only when scenario_id is provided)
    # Even for explicit scenarios, use policies from Supabase (no hardcoded policy names)
    if scenario_id:
        # Load policies from Supabase (no caching - fresh on each run)
        policies = load_policies(policy_pack_version)
        
        # Filter policies by scope - ensure copilot is treated as first-class input type
        applicable_policies = []
        for policy in policies:
            scope = policy.get("scope", [])
            # Handle case where scope might be stored as a string or list
            if isinstance(scope, str):
                scope = [scope]
            if input_type in scope:
                applicable_policies.append(policy)
        
        # Log policy filtering for debugging
        print(f"[POLICY_FILTER] input_type='{input_type}', scenario_id='{scenario_id}', total_policies={len(policies)}, applicable_policies={len(applicable_policies)}")
        if applicable_policies:
            print(f"[POLICY_FILTER] applicable_policy_names={[p['name'] for p in applicable_policies]}")
        
        evaluated_policies = []
        all_matches = []
        
        # Evaluate each enabled policy that matches the input_type scope
        for policy in applicable_policies:
            
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
                        match_start, match_end = match.span()
                        matched_text = match.group()
                        
                        # Extract value portion for annotation (records only the value, not the key)
                        value_start, value_end, value_span = extract_value_span(matched_text, match_start, match_end)
                        
                        # Store: (match_start, match_end, matched_text_full, value_start, value_end, value_span, policy_name, policy_action)
                        # match_start/end and matched_text needed for redaction (preserves key name)
                        # value_start/end/span needed for annotation (records only value for UI highlighting)
                        all_matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy_name, policy_action))
                except re.error as e:
                    # Log pattern errors but continue
                    print(f"Warning: Invalid regex pattern in policy {policy_name}: {pattern_str} - {e}")
            
            # Check if this policy had any matches
            if any(p[6] == policy_name for p in all_matches):
                evaluated_policies.append(policy_name)
        
        # Sort + de-dupe overlaps (based on value portion to avoid overlapping annotations)
        all_matches.sort(key=lambda x: (x[3], x[4]))  # Sort by value_start, value_end
        matches = []
        last_value_end = -1
        for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in all_matches:
            if value_start >= last_value_end:
                matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy, action))
                last_value_end = value_end
        
        # Build annotations using VALUE portion only (for UI highlighting and SIEM export)
        # Each annotation records: policy_name, action, start, end, span (all for VALUE portion)
        annotations = [
            Annotation(span=value_span, policy_name=policy, action=action, start=value_start, end=value_end)
            for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in matches
        ]
        
        # Determine verdict based on actions (priority: BLOCK > REVIEW > REDACT)
        if any(a.action == "BLOCK" for a in annotations):
            verdict = "BLOCKED"
            user_message = "This request was blocked due to potential prompt injection."
            governed_output = "I cannot fulfill this request. It appears to be attempting to override my instructions."
        elif any(a.action == "REVIEW" for a in annotations):
            verdict = "REVIEW"
            user_message = "This content requires manual review before release."
            # Replace governed_output with held message (do not echo original content)
            review_policies = [a.policy_name for a in annotations if a.action == "REVIEW"]
            governed_output = f"This content is held for review due to policy: {', '.join(set(review_policies))}."
        elif annotations:
            verdict = "REDACTED"
            user_message = "Output has been redacted to remove sensitive information."
            # Apply redactions from end -> start to avoid index drift
            # Use full match info (match_start, match_end, matched_text) for redaction (preserves key name)
            for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in sorted(matches, key=lambda x: x[0], reverse=True):
                if action == "REDACT":
                    # Preserve variable names for KEY=VALUE or KEY: VALUE formats
                    governed_output = apply_redaction(governed_output, match_start, match_end, matched_text)
        
        # Generate events using policy names from DB
        events = [
            {"event_type": "Input Sanitized", "payload": {"input_length": len(input_content)}},
            {"event_type": "Policy Evaluated", "payload": {"policies": evaluated_policies}},
        ]
        
        # Track review reasons for meta field
        review_reasons = []
        
        if annotations:
            violations = {}
            for ann in annotations:
                if ann.policy_name not in violations:
                    violations[ann.policy_name] = 0
                violations[ann.policy_name] += 1
                
                # Track review reasons
                if ann.action == "REVIEW":
                    # Find policy ID from applicable_policies list
                    policy_id = None
                    for p in applicable_policies:
                        if p["name"] == ann.policy_name:
                            policy_id = p["id"]
                            break
                    review_reasons.append({
                        "policy_id": policy_id or "unknown",
                        "policy_name": ann.policy_name,
                        "matches": 1  # Will be aggregated below
                    })
            
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
            
            review_count = sum(1 for a in annotations if a.action == "REVIEW")
            if review_count > 0:
                events.append({
                    "event_type": "Action Applied",
                    "payload": {"action": "REVIEW", "reviews": review_count}
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
        
        # Build meta with review information
        review_reasons_aggregated = {}
        for reason in review_reasons:
            key = reason["policy_id"]
            if key not in review_reasons_aggregated:
                review_reasons_aggregated[key] = {
                    "policy_id": reason["policy_id"],
                    "policy_name": reason["policy_name"],
                    "matches": 0
                }
            review_reasons_aggregated[key]["matches"] += 1
        
        meta = {
            "annotations": [a.dict() for a in annotations],
            "review_required": verdict == "REVIEW",
        }
        if review_reasons_aggregated:
            meta["review_reasons"] = list(review_reasons_aggregated.values())
    
    return {
        "baseline_output": baseline_output,
        "governed_output": governed_output,
        "verdict": verdict,
        "user_message": user_message,
        "annotations": annotations,
        "events": events,
        "meta": meta,
    }


@app.post("/v1/runs", response_model=CreateRunResponse)
async def create_run(request: CreateRunRequest):
    """Create a new run and generate stub results"""
    # Validate JSON content for copilot input type
    if request.input_type == "copilot":
        try:
            json.loads(request.input_content)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400,
                detail=f"input_content must be valid JSON for input_type='copilot': {str(e)}"
            )
    
    run_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    policy_pack_version = "v1"
    
    # Generate demo results (loads policies from Supabase when scenario_id is None)
    result = generate_demo_run(request.input_type, request.input_content, request.scenario_id, policy_pack_version)
    
    # Create input preview (first 100 chars)
    input_preview = request.input_content[:100] + ("..." if len(request.input_content) > 100 else "")
    
    # Insert run
    # Build meta field with annotations and review information
    meta = {"annotations": [a.dict() for a in result["annotations"]]}
    if "meta" in result:
        meta.update(result["meta"])
    
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
        "meta": meta
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
    
    # Extract platform metadata for copilot runs to distinguish from API/portal-based AI usage
    if run.input_type == "copilot":
        try:
            copilot_data = json.loads(run.input_content)
            platform_metadata = {
                "platform": copilot_data.get("platform", "Unknown"),
                "workload": copilot_data.get("workload", None),
                "sensitivity_label": copilot_data.get("sensitivity_label", None),
                "user": {
                    "id": copilot_data.get("user", {}).get("id", None),
                    "email": copilot_data.get("user", {}).get("email", None),
                    "department": copilot_data.get("user", {}).get("department", None),
                    "role": copilot_data.get("user", {}).get("role", None),
                },
                "action_type": copilot_data.get("action", {}).get("type", None),
                "compliance_flags": copilot_data.get("compliance_flags", []),
                "action_context": {
                    "conversation_id": copilot_data.get("action", {}).get("context", {}).get("conversation_id", None),
                    "topic": copilot_data.get("action", {}).get("context", {}).get("topic", None),
                } if copilot_data.get("action", {}).get("context") else None
            }
            siem_payload["platform_metadata"] = platform_metadata
            # Add source field to clearly distinguish Copilot activity
            siem_payload["source"] = "copilot"
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            # If JSON parsing fails, still mark as copilot but without detailed metadata
            siem_payload["source"] = "copilot"
            siem_payload["platform_metadata"] = {
                "error": "Failed to parse copilot metadata",
                "error_details": str(e)
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


class Insight(BaseModel):
    id: str
    severity: str
    title: str
    detail: str
    is_placeholder: bool


class GetInsightsResponse(BaseModel):
    status: str
    generated_at: str
    insights: List[Insight]


@app.get("/v1/insights", response_model=GetInsightsResponse)
async def get_insights():
    """
    Get policy insights (stub/placeholder endpoint).
    
    This endpoint returns example insights for demonstration purposes only.
    In Phase 2, this would analyze actual usage patterns to recommend policy refinements.
    """
    # Placeholder insights - these are static examples, not real analysis
    placeholder_insights = [
        Insight(
            id="insight-1",
            severity="info",
            title="Secrets Policy Scope Recommendation",
            detail="Spike in Secrets Policy matches from .env snippets — consider tightening 'code' scope.",
            is_placeholder=True
        ),
        Insight(
            id="insight-2",
            severity="warning",
            title="Email Detection Gap",
            detail="Repeated near-misses for customer emails in support tickets — add/enable email detection policy.",
            is_placeholder=True
        ),
        Insight(
            id="insight-3",
            severity="info",
            title="Project-Specific IP Policy Suggestion",
            detail="Project Jaguar keyword appears in 6 runs this week — consider adding a bespoke IP policy.",
            is_placeholder=True
        ),
        Insight(
            id="insight-4",
            severity="warning",
            title="High Redaction Volume",
            detail="High volume of REDACTED verdicts in chat inputs — review policy thresholds.",
            is_placeholder=True
        ),
        Insight(
            id="insight-5",
            severity="info",
            title="Workload-Specific Policy Recommendation",
            detail="Copilot workload 'Microsoft Teams' shows elevated compliance flags — consider workload-specific policies.",
            is_placeholder=True
        ),
    ]
    
    return GetInsightsResponse(
        status="stub",
        generated_at=datetime.utcnow().isoformat(),
        insights=placeholder_insights
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

// Shared TypeScript types for Sentinel Demo

export type InputType = 'chat' | 'file' | 'code' | 'copilot';
export type Verdict = 'SHIPPABLE' | 'REDACTED' | 'BLOCKED' | 'REVIEW';
export type PolicyStatus = 'ENABLED' | 'DISABLED';
export type EventType = 
  | 'Input Sanitized'
  | 'Policy Evaluated'
  | 'Violation Detected'
  | 'Action Applied'
  | 'Final Output Released';

export interface Annotation {
  span: string;
  policy_name: string;
  action: 'REDACT' | 'BLOCK' | 'REVIEW';
  start: number;
  end: number;
}

export interface Run {
  id: string;
  created_at: string;
  input_type: InputType;
  input_preview: string | null;
  input_content: string;
  scenario_id: string | null;
  verdict: Verdict;
  baseline_output: string | null;
  governed_output: string | null;
  user_message: string | null;
  policy_pack_version: string;
  meta: Record<string, any>;
}

export interface RunEvent {
  id: string;
  run_id: string;
  ts: string;
  seq: number;
  event_type: EventType;
  payload: Record<string, any>;
}

export interface Policy {
  id: string;
  name: string;
  scope: InputType[];
  status: PolicyStatus;
  version: number;
  conditions: Record<string, any>;
  action: string;
  updated_at: string;
  updated_by: string;
}

export interface CreateRunRequest {
  input_type: InputType;
  input_content: string;
  scenario_id?: 'pii_chat' | 'file_comp' | 'code_secret' | 'injection';
}

export interface CreateRunResponse {
  run_id: string;
  verdict: Verdict;
  user_message: string;
  baseline_output: string;
  governed_output: string;
  annotations: Annotation[];
}

export interface GetRunResponse {
  run: Run;
  events: RunEvent[];
  annotations: Annotation[];
}

export interface ExportResponse {
  run: Run;
  events: RunEvent[];
  policy_snapshot: {
    policy_pack_version: string;
    policies: Policy[];
  };
  siem_payload_preview: Record<string, any>;
}

export interface GetPoliciesResponse {
  policy_pack_version: string;
  policies: Policy[];
}

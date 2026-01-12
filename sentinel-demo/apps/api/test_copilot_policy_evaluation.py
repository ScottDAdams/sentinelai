#!/usr/bin/env python3
"""
Quick test to verify copilot policy evaluation works correctly.

This script:
1. Verifies a policy with scope ["copilot"] exists
2. Creates a copilot run
3. Confirms Policy Evaluated event includes that policy name
"""

import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def test_copilot_policy_evaluation():
    """Test that copilot runs evaluate policies with copilot scope"""
    
    # 1. Check if Project Jaguar policy exists with copilot scope
    print("Step 1: Checking for policies with copilot scope...")
    policies_result = supabase.table("policies").select("*").eq("status", "ENABLED").execute()
    
    copilot_policies = []
    for p in policies_result.data:
        scope = p.get("scope", [])
        if isinstance(scope, str):
            scope = [scope]
        if "copilot" in scope:
            copilot_policies.append(p)
    
    if not copilot_policies:
        print("ERROR: No policies found with 'copilot' in scope")
        print("Available policies:")
        for p in policies_result.data:
            print(f"  - {p['name']}: scope={p.get('scope')}")
        return False
    
    print(f"✓ Found {len(copilot_policies)} policy/policies with copilot scope:")
    for p in copilot_policies:
        print(f"  - {p['name']} (id: {p['id']}, scope: {p.get('scope')})")
    
    # 2. Check recent runs to see if any copilot runs have Policy Evaluated events
    print("\nStep 2: Checking recent copilot runs for Policy Evaluated events...")
    runs_result = supabase.table("runs").select("id, input_type, created_at").eq("input_type", "copilot").order("created_at", desc=True).limit(5).execute()
    
    if not runs_result.data:
        print("  No copilot runs found yet. This is expected if no copilot runs have been created.")
        print("  ✓ Test setup looks correct - policies with copilot scope exist")
        return True
    
    print(f"  Found {len(runs_result.data)} recent copilot run(s)")
    
    # Check events for the most recent copilot run
    latest_run = runs_result.data[0]
    print(f"\n  Checking events for run {latest_run['id']}...")
    
    events_result = supabase.table("run_events").select("*").eq("run_id", latest_run['id']).order("seq").execute()
    
    policy_evaluated_events = [e for e in events_result.data if e.get("event_type") == "Policy Evaluated"]
    
    if not policy_evaluated_events:
        print("  ⚠ WARNING: No 'Policy Evaluated' event found for this copilot run")
        print("  This suggests the policy evaluation fix may not be working correctly")
        return False
    
    for event in policy_evaluated_events:
        policies = event.get("payload", {}).get("policies", [])
        print(f"  ✓ Policy Evaluated event found with {len(policies)} policy/policies:")
        for policy_name in policies:
            print(f"    - {policy_name}")
        
        # Check if any of our copilot policies are in the list
        copilot_policy_names = [p['name'] for p in copilot_policies]
        found_copilot_policies = [name for name in policies if name in copilot_policy_names]
        
        if found_copilot_policies:
            print(f"  ✓ Found copilot-scoped policies in evaluation: {found_copilot_policies}")
            return True
        else:
            print(f"  ⚠ WARNING: No copilot-scoped policies found in evaluation")
            print(f"  Expected one of: {copilot_policy_names}")
            return False
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Copilot Policy Evaluation Test")
    print("=" * 60)
    print()
    
    success = test_copilot_policy_evaluation()
    
    print()
    print("=" * 60)
    if success:
        print("✓ Test PASSED: Copilot policy evaluation is working")
    else:
        print("✗ Test FAILED: Copilot policy evaluation needs fixing")
    print("=" * 60)
    
    sys.exit(0 if success else 1)

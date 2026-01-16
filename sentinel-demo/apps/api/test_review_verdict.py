#!/usr/bin/env python3
"""
Quick test to verify HELD_FOR_REVIEW verdict behavior:
- governed_output should be replaced with "held for review" message
- verdict should be HELD_FOR_REVIEW
- meta should include review_required: true and review_reasons
"""

import sys
import os

# Add parent directory to path to import from main.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the generate_demo_run function
from main import generate_demo_run

def test_review_verdict():
    """Test that REVIEW policy causes governed_output to be held message"""
    
    # Test with Project Jaguar sample (should trigger project-jaguar-ip-protection policy)
    test_content = """Hey, can you help me summarize the latest updates on Project Jaguar?

We're finalizing the Jaguar architecture for the next prototype iteration, and I want to make sure I'm aligned before the design review. Specifically:
- How the new Jaguar airfoil design differs from the previous revision
- Any open risks in the Jaguar control system that engineering flagged last week
- Whether the Jaguar prototype timeline is still realistic given the latest test results

This is for internal planning only, but I want a concise breakdown I can share with the core Jaguar project team before tomorrow's meeting."""
    
    result = generate_demo_run("chat", test_content, None, "v1")
    
    # Verify verdict is HELD_FOR_REVIEW
    assert result["verdict"] == "HELD_FOR_REVIEW", f"Expected HELD_FOR_REVIEW verdict, got {result['verdict']}"
    
    # Verify governed_output is NOT the original content
    assert result["governed_output"] != test_content, "governed_output should not contain original content"
    
    # Verify governed_output contains "held for review"
    assert "held for review" in result["governed_output"].lower(), \
        f"governed_output should contain 'held for review' message, got: {result['governed_output']}"
    
    # Verify baseline_output is unchanged (for audit)
    assert result["baseline_output"] == test_content, "baseline_output should remain unchanged"
    
    # Verify user_message
    assert "manual review" in result["user_message"].lower(), \
        f"user_message should mention manual review, got: {result['user_message']}"
    
    # Verify meta includes review_required
    assert "meta" in result, "result should include meta field"
    assert result["meta"]["review_required"] == True, "meta.review_required should be True"
    
    # Verify review_reasons if annotations exist
    if result["annotations"]:
        review_annotations = [a for a in result["annotations"] if a.action == "REVIEW"]
        if review_annotations:
            assert "review_reasons" in result["meta"], "meta should include review_reasons"
            assert len(result["meta"]["review_reasons"]) > 0, "review_reasons should not be empty"
            assert "policy_name" in result["meta"]["review_reasons"][0], \
                "review_reasons should include policy_name"
            assert "matches" in result["meta"]["review_reasons"][0], \
                "review_reasons should include matches count"
    
    print("✓ All REVIEW verdict tests passed!")
    print(f"  Verdict: {result['verdict']}")
    print(f"  Governed output: {result['governed_output'][:100]}...")
    print(f"  Review required: {result['meta']['review_required']}")
    if "review_reasons" in result["meta"]:
        print(f"  Review reasons: {result['meta']['review_reasons']}")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("REVIEW Verdict Behavior Test")
    print("=" * 60)
    print()
    
    try:
        success = test_review_verdict()
        print()
        print("=" * 60)
        print("✓ Test PASSED: REVIEW verdict behavior is correct")
        print("=" * 60)
        sys.exit(0)
    except AssertionError as e:
        print()
        print("=" * 60)
        print(f"✗ Test FAILED: {e}")
        print("=" * 60)
        sys.exit(1)
    except Exception as e:
        print()
        print("=" * 60)
        print(f"✗ Test ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 60)
        sys.exit(1)

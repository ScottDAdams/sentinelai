"""
Shared mapping utility for policy actions to canonical verdicts.
Ensures consistent verdict assignment across API and UI.
"""

# Canonical verdict set (hard requirement)
CANONICAL_VERDICTS = {"ALLOWED", "REDACTED", "HELD_FOR_REVIEW", "BLOCKED"}

def policy_action_to_verdict(actions: list) -> str:
    """
    Map policy actions to canonical verdict.
    Priority: BLOCK > REVIEW > REDACT > ALLOW
    
    Args:
        actions: List of policy action strings (e.g., ["BLOCK", "REDACT"])
    
    Returns:
        Canonical verdict string: "ALLOWED", "REDACTED", "HELD_FOR_REVIEW", or "BLOCKED"
    """
    if not actions:
        return "ALLOWED"
    
    # Priority: BLOCK > REVIEW > REDACT
    if any(action == "BLOCK" for action in actions):
        return "BLOCKED"
    elif any(action == "REVIEW" for action in actions):
        return "HELD_FOR_REVIEW"
    elif any(action == "REDACT" for action in actions):
        return "REDACTED"
    else:
        return "ALLOWED"

def get_user_message_for_verdict(verdict: str) -> str:
    """
    Get user-facing message for a verdict.
    
    Args:
        verdict: Canonical verdict string
    
    Returns:
        User message string
    """
    messages = {
        "ALLOWED": "Output approved.",
        "REDACTED": "Output has been redacted to remove sensitive information.",
        "HELD_FOR_REVIEW": "This content requires manual review before release.",
        "BLOCKED": "This request was blocked due to an attempt to bypass safeguards or defeat governance controls.",
    }
    return messages.get(verdict, "Output approved.")

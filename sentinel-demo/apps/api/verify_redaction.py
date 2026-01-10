"""
Verification script to test redaction on demo samples
"""
import re

def extract_value_span(matched_text: str, match_start: int, match_end: int):
    """Extract the value portion span from a KEY=VALUE or Header: Value match."""
    if '=' in matched_text:
        delimiter_idx = matched_text.find('=')
        value_start_in_match = delimiter_idx + 1
        while value_start_in_match < len(matched_text) and matched_text[value_start_in_match] in ' \t':
            value_start_in_match += 1
        value_span = matched_text[value_start_in_match:]
        value_start = match_start + value_start_in_match
        value_end = match_end
        return (value_start, value_end, value_span)
    elif ':' in matched_text:
        delimiter_idx = matched_text.find(':')
        value_start_in_match = delimiter_idx + 1
        while value_start_in_match < len(matched_text) and matched_text[value_start_in_match] in ' \t':
            value_start_in_match += 1
        value_span = matched_text[value_start_in_match:]
        value_start = match_start + value_start_in_match
        value_end = match_end
        return (value_start, value_end, value_span)
    else:
        return (match_start, match_end, matched_text)

def apply_redaction(content: str, start: int, end: int, matched_text: str) -> str:
    """Apply redaction to content, preserving variable names for KEY=VALUE or KEY: VALUE formats."""
    if '=' in matched_text:
        delimiter_idx = matched_text.find('=')
        replacement = matched_text[:delimiter_idx + 1] + "[REDACTED]"
    elif ':' in matched_text:
        delimiter_idx = matched_text.find(':')
        space_after_colon = 0
        if delimiter_idx + 1 < len(matched_text) and matched_text[delimiter_idx + 1] == ' ':
            space_after_colon = 1
        replacement = matched_text[:delimiter_idx + 1 + space_after_colon] + "[REDACTED]"
    else:
        replacement = "[REDACTED]"
    
    return content[:start] + replacement + content[end:]

# Demo samples (simplified for testing)
SAMPLES = {
    "support_ticket": {
        "content": "User confirmed their email as jessica.m.hollis@gmail.com and said she recently changed phones.\nCallback number on file was +1 (703) 555-0194.",
        "input_type": "chat",
        "expected": ["jessica.m.hollis@gmail.com", "+1 (703) 555-0194"]
    },
    "slack_dump": {
        "content": "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "input_type": "chat",
        "expected": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
    },
    "env_leak": {
        "content": "DATABASE_URL=postgres://app_user:Sup3rS3cretP@ss@db.internal.prod:5432/appdb\nJWT_SIGNING_KEY=8f3c9a2e4b1d7a9c0f8e2a1d9c4b7e6f\nSTRIPE_SECRET_KEY=sk_test_FAKE_KEY_1234567890ABCDEFGHIJKLMNOP\nSENTRY_DSN=https://a1b2c3d4e5@errors.internal/42",
        "input_type": "code",
        "expected": ["DATABASE_URL", "JWT_SIGNING_KEY", "STRIPE_SECRET_KEY", "SENTRY_DSN"]
    },
    "app_logs": {
        "content": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4ODIxLCJyb2xlIjoiYWRtaW4ifQ.Qd9s8JZP5exampleSig",
        "input_type": "code",
        "expected": ["Authorization"]
    }
}

def test_sample_redaction(sample_name, content, input_type):
    """Test redaction on a sample"""
    print(f"\n=== Testing {sample_name} ({input_type}) ===")
    
    # Simulate pattern matching (using simplified patterns for testing)
    patterns = []
    if input_type == "chat":
        # Email and phone patterns
        patterns.append((r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', "Sensitive Data Policy"))
        patterns.append((r'\b(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b', "Sensitive Data Policy"))
        # AWS key patterns
        patterns.append((r'\bAWS_ACCESS_KEY_ID\s*[:=]\s*[^\s\n]+\b', "Secrets Policy"))
        patterns.append((r'\bAWS_SECRET_ACCESS_KEY\s*[:=]\s*[^\s\n]+\b', "Secrets Policy"))
    elif input_type == "code":
        # Database URL, JWT, Stripe, Sentry patterns
        patterns.append((r'\bDATABASE_URL\s*[:=]\s*[^\s\n]+\b', "Secrets Policy"))
        patterns.append((r'postgres://[^\s\n]+', "Secrets Policy"))
        patterns.append((r'postgresql://[^\s\n]+', "Secrets Policy"))
        patterns.append((r'\bJWT_SIGNING_KEY\s*[:=]\s*[^\s\n]+\b', "Secrets Policy"))
        patterns.append((r'\b[A-Z_]+_SECRET\s*[:=]\s*[^\s\n]+\b', "Secrets Policy"))
        patterns.append((r'\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b', "Secrets Policy"))
        patterns.append((r'\bSENTRY_DSN\s*[:=]\s*[^\s\n]+\b', "Secrets Policy"))
        # JWT token pattern (for Authorization header)
        patterns.append((r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b', "Secrets Policy"))
    
    matches = []
    for pattern, policy in patterns:
        for match in re.finditer(pattern, content, re.IGNORECASE):
            match_start, match_end = match.span()
            matched_text = match.group()
            value_start, value_end, value_span = extract_value_span(matched_text, match_start, match_end)
            matches.append((match_start, match_end, matched_text, value_start, value_end, value_span, policy, "REDACT"))
    
    if not matches:
        print(f"  ⚠ No matches found")
        return False
    
    print(f"  Found {len(matches)} match(es)")
    
    # Sort by match_start (reverse) for redaction
    matches.sort(key=lambda x: x[0], reverse=True)
    
    # Apply redactions
    governed_output = content
    for match_start, match_end, matched_text, value_start, value_end, value_span, policy, action in matches:
        print(f"    Match: {matched_text[:50]}...")
        print(f"    Value portion: {value_span[:50]}...")
        governed_output = apply_redaction(governed_output, match_start, match_end, matched_text)
    
    print(f"  Result: {governed_output[:200]}...")
    
    # Verify key names are preserved
    has_preserved_keys = any('=' in line and '[REDACTED]' in line for line in governed_output.split('\n'))
    print(f"  ✓ Key names preserved: {has_preserved_keys}")
    
    return True

if __name__ == "__main__":
    print("Verifying redaction on demo samples...\n")
    
    for sample_name, sample_data in SAMPLES.items():
        test_sample_redaction(sample_name, sample_data["content"], sample_data["input_type"])
    
    print("\n✓ Verification complete!")

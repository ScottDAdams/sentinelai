"""
Unit tests for redaction logic
"""


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


def test_jwt_key_redaction():
    """Test: JWT_SIGNING_KEY=abc -> JWT_SIGNING_KEY=[REDACTED] (redaction preserves key)"""
    content = "JWT_SIGNING_KEY=abc123def456"
    start = 0
    end = len(content)
    matched = "JWT_SIGNING_KEY=abc123def456"
    
    # Test redaction
    result = apply_redaction(content, start, end, matched)
    assert result == "JWT_SIGNING_KEY=[REDACTED]", f"Expected 'JWT_SIGNING_KEY=[REDACTED]', got '{result}'"
    
    # Test annotation records only value portion
    value_start, value_end, value_span = extract_value_span(matched, start, end)
    assert value_span == "abc123def456", f"Expected value_span='abc123def456', got '{value_span}'"
    assert content[value_start:value_end] == "abc123def456", "Value span should match actual value"
    print("✓ test_jwt_key_redaction passed")


def test_database_url_redaction():
    """Test: DATABASE_URL=postgres://user:pass@host/db -> DATABASE_URL=[REDACTED] (redaction preserves key)"""
    content = "DATABASE_URL=postgres://app_user:Sup3rS3cretP@ss@db.internal.prod:5432/appdb"
    start = 0
    end = len(content)
    matched = "DATABASE_URL=postgres://app_user:Sup3rS3cretP@ss@db.internal.prod:5432/appdb"
    
    # Test redaction
    result = apply_redaction(content, start, end, matched)
    assert result == "DATABASE_URL=[REDACTED]", f"Expected 'DATABASE_URL=[REDACTED]', got '{result}'"
    
    # Test annotation records only value portion (the URL)
    value_start, value_end, value_span = extract_value_span(matched, start, end)
    assert value_span == "postgres://app_user:Sup3rS3cretP@ss@db.internal.prod:5432/appdb", f"Expected URL in value_span, got '{value_span}'"
    assert content[value_start:value_end] == value_span, "Value span should match actual value"
    print("✓ test_database_url_redaction passed")


def test_authorization_header_redaction():
    """Test: Authorization: Bearer <jwt> -> Authorization: Bearer [REDACTED] (redaction preserves header)"""
    # Test case: Pattern matches just the JWT token part (realistic scenario)
    # Headers like "Authorization: Bearer <token>" - pattern would match just the token
    content = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    start = content.find("eyJ")
    end = len(content)
    matched = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    
    # Test redaction (no delimiter in matched token, replaces entire span)
    result = apply_redaction(content, start, end, matched)
    expected = "Authorization: Bearer [REDACTED]"
    assert result == expected, f"Expected '{expected}', got '{result}'"
    
    # Test annotation records only value portion (the token itself, no key)
    value_start, value_end, value_span = extract_value_span(matched, start, end)
    assert value_span == "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", f"Expected token in value_span, got '{value_span}'"
    assert value_start == start and value_end == end, "Value span should match full match when no delimiter"
    assert content[value_start:value_end] == value_span, "Value span should match actual content"
    print("✓ test_authorization_header_redaction passed")


def test_bare_token_redaction():
    """Test: A bare token match -> [REDACTED] (entire span is value, no key)"""
    # Using obviously fake key pattern for testing (NOT a real secret)
    content = "sk_test_FAKE_KEY_1234567890ABCDEFGHIJKLMNOP"
    start = 0
    end = len(content)
    matched = "sk_test_FAKE_KEY_1234567890ABCDEFGHIJKLMNOP"
    
    # Test redaction (no key to preserve)
    result = apply_redaction(content, start, end, matched)
    assert result == "[REDACTED]", f"Expected '[REDACTED]', got '{result}'"
    
    # Test annotation records entire span (no delimiter, so entire match is value)
    value_start, value_end, value_span = extract_value_span(matched, start, end)
    assert value_span == matched, f"Expected entire match as value_span, got '{value_span}'"
    assert value_start == start and value_end == end, "Value span should match full match when no delimiter"
    # Verify redaction worked (entire span replaced)
    assert "[REDACTED]" in result and "sk_test" not in result, "Bare token should be fully redacted"
    print("✓ test_bare_token_redaction passed")


def test_colon_delimiter_redaction():
    """Test: KEY: VALUE format with colon delimiter"""
    content = "API_KEY: my_secret_key_12345"
    start = 0
    end = len(content)
    matched = "API_KEY: my_secret_key_12345"
    
    result = apply_redaction(content, start, end, matched)
    assert result == "API_KEY: [REDACTED]", f"Expected 'API_KEY: [REDACTED]', got '{result}'"
    print("✓ test_colon_delimiter_redaction passed")


def test_multiple_matches():
    """Test: Multiple redactions preserving variable names"""
    content = "JWT_SIGNING_KEY=abc\nDATABASE_URL=postgres://host/db\nSECRET_TOKEN=xyz"
    # Simulate redacting JWT_SIGNING_KEY
    result = apply_redaction(content, 0, 18, "JWT_SIGNING_KEY=abc")
    assert "JWT_SIGNING_KEY=[REDACTED]" in result
    print("✓ test_multiple_matches passed")


if __name__ == "__main__":
    print("Running redaction unit tests...\n")
    
    test_jwt_key_redaction()
    test_database_url_redaction()
    test_authorization_header_redaction()
    test_bare_token_redaction()
    test_colon_delimiter_redaction()
    test_multiple_matches()
    
    print("\n✓ All tests passed!")

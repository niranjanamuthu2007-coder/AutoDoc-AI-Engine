import pytest
import datetime
from app.auth import (
    create_access_token, 
    create_refresh_token, 
    verify_token, 
    verify_google_token
)
def test_jwt_generation_and_verification():
    payload = {"user_id": 42, "email": "test@autodoc.com"}
    access_token = create_access_token(data=payload)
    
    # Decrypt and check
    decrypted = verify_token(access_token)
    assert decrypted is not None
    assert decrypted["user_id"] == 42
    assert decrypted["email"] == "test@autodoc.com"
    assert "exp" in decrypted
def test_refresh_token_flag():
    payload = {"user_id": 42}
    refresh_token = create_refresh_token(data=payload)
    
    decrypted = verify_token(refresh_token)
    assert decrypted is not None
    assert decrypted["user_id"] == 42
    assert decrypted["refresh"] is True
@pytest.mark.asyncio
async def test_mock_google_oauth_fallback():
    # If GOOGLE_CLIENT_ID is empty (dev environment), OAuth verifies simulated user
    profile = await verify_google_token("any_mock_credential_id")
    assert profile["sub"] == "mock_google_id_12345"
    assert profile["email"] == "demo@autodoc-ai.com"
    assert profile["name"] == "Demo Developer"
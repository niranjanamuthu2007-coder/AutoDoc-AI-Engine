from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import GoogleLoginRequest, Token, UserProfile
from app.auth import (
    verify_google_token, 
    create_access_token, 
    create_refresh_token, 
    verify_token,
    get_current_user
)
router = APIRouter(prefix="/auth", tags=["auth"])
@router.post("/google", response_model=Token)
async def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Callback endpoint triggered on frontend Google OAuth success.
    Verifies ID Token and creates/updates a local User session.
    """
    token_payload = await verify_google_token(payload.credential)
    
    google_id = token_payload.get("sub")
    email = token_payload.get("email")
    name = token_payload.get("name", email.split("@")[0])
    picture = token_payload.get("picture")
    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token missing identity parameters."
        )
    # Check if user exists, otherwise create
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        # Also check by email to merge accounts if needed
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_id = google_id
            user.picture = picture or user.picture
            user.name = name or user.name
        else:
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                picture=picture
            )
            db.add(user)
        
        db.commit()
        db.refresh(user)
    # Issue JWT credentials
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    refresh_token = create_refresh_token(data={"user_id": user.id})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
@router.post("/refresh", response_model=Token)
def refresh_token_route(refresh_token: str, db: Session = Depends(get_db)):
    """
    Exchange refresh token for brand new access & refresh credentials.
    """
    payload = verify_token(refresh_token)
    if not payload or not payload.get("refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    new_refresh_token = create_refresh_token(data={"user_id": user.id})
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }
@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retrieves currently logged-in user profile metrics.
    """
    return current_user
@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Invalidates session (standard logout response).
    """
    return {"detail": "Successfully logged out"}


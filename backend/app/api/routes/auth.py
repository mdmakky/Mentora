"""
Authentication Routes
Handles user registration, login, profile management
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
import random
import string
import logging
import os
import shutil
from pathlib import Path

from app.db.database import get_db
from app.models.user import User
from app.models.password_reset import PasswordReset
from app.schemas.user import (
    UserRegister, UserLogin, UserUpdate, PasswordChange,
    PasswordResetRequest, PasswordResetVerify, PasswordResetComplete,
    TokenResponse, UserResponse, ProfileResponse, UserStatistics
)
from app.core.security import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from app.core.config import Settings
from app.core.email import get_email_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Get settings
settings = Settings()
email_service = get_email_service(settings)


def generate_reset_code() -> str:
    """Generate a 6-digit reset code"""
    return ''.join(random.choices(string.digits, k=6))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new user
    """
    # Check if username exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if email exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Create token
    access_token = create_access_token(data={"user_id": new_user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(new_user)
    }


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Login user and return token
    """
    # Find user
    result = await db.execute(select(User).where(User.username == credentials.username))
    user = result.scalar_one_or_none()
    
    print(f"🔍 Login attempt for username: {credentials.username}")
    print(f"🔍 User found: {user is not None}")
    
    if user:
        print(f"🔍 User email: {user.email}")
        print(f"🔍 Stored hash: {user.hashed_password[:20]}...")
        password_valid = verify_password(credentials.password, user.hashed_password)
        print(f"🔍 Password valid: {password_valid}")
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        print(f"❌ Login failed!")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    print(f"✅ Login successful!")
    # Create token
    access_token = create_access_token(data={"user_id": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout user (client should delete token)
    """
    return {"message": "Successfully logged out"}


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's profile with statistics
    """
    from app.models.document import Document
    from app.models.chat import ChatSession
    from sqlalchemy import func
    
    # Get document count
    doc_count_result = await db.execute(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )
    total_documents = doc_count_result.scalar() or 0
    
    # Get chat session count
    chat_count_result = await db.execute(
        select(func.count(ChatSession.id)).where(ChatSession.user_id == current_user.id)
    )
    total_chat_sessions = chat_count_result.scalar() or 0
    
    # Get total pages from documents
    pages_result = await db.execute(
        select(func.sum(Document.total_pages)).where(Document.user_id == current_user.id)
    )
    total_pages = pages_result.scalar() or 0
    
    return {
        "user": UserResponse.from_orm(current_user),
        "statistics": UserStatistics(
            total_documents=total_documents,
            total_chat_sessions=total_chat_sessions,
            total_pages=total_pages
        )
    }


@router.put("/profile", response_model=dict)
async def update_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user profile
    """
    # Update fields if provided
    if updates.email:
        current_user.email = updates.email
    if updates.first_name is not None:
        current_user.first_name = updates.first_name
    if updates.last_name is not None:
        current_user.last_name = updates.last_name
    if updates.bio is not None:
        current_user.bio = updates.bio
    if updates.phone is not None:
        current_user.phone = updates.phone
    
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "message": "Profile updated successfully",
        "user": UserResponse.from_orm(current_user)
    }


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload user avatar image
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files (JPEG, PNG, WebP) are allowed"
        )
    
    # Validate file size (max 5MB)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    # Use settings for avatar directory
    from app.core.config import settings
    avatar_dir = settings.AVATARS_PATH
    avatar_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"user_{current_user.id}_{datetime.utcnow().timestamp()}.{file_extension}"
    file_path = avatar_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Delete old avatar if exists
    if current_user.avatar:
        old_avatar_filename = current_user.avatar.split("/")[-1]
        old_avatar_path = avatar_dir / old_avatar_filename
        if old_avatar_path.exists():
            old_avatar_path.unlink()
    
    # Update user avatar in database (store relative path)
    current_user.avatar = f"avatars/{unique_filename}"
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": f"/media/avatars/{unique_filename}",
        "user": UserResponse.from_orm(current_user)
    }


@router.post("/change-password")
async def change_password(
    passwords: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change user password
    """
    # Verify old password
    if not verify_password(passwords.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect"
        )
    
    # Set new password
    current_user.hashed_password = get_password_hash(passwords.new_password)
    await db.commit()
    
    # Create new token
    access_token = create_access_token(data={"user_id": current_user.id})
    
    return {
        "message": "Password changed successfully",
        "token": access_token
    }


@router.post("/password-reset/request")
async def request_password_reset(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """
    Request password reset - sends a 6-digit code to email
    """
    try:
        # Check if user exists
        result = await db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if email exists or not (security best practice)
            return {
                "message": "If the email exists, a reset code has been sent",
                "email": data.email
            }
        
        # Generate 6-digit code
        reset_code = generate_reset_code()
        logger.info(f"Generated reset code for {data.email}: {reset_code}")
        
        # Create password reset record
        expires_at = datetime.utcnow() + timedelta(minutes=15)  # Code expires in 15 minutes
        password_reset = PasswordReset(
            email=data.email,
            reset_code=reset_code,
            expires_at=expires_at
        )
        
        print(f"🔍 About to add password_reset to db")
        db.add(password_reset)
        print(f"🔍 About to commit")
        await db.commit()
        print(f"🔍 Commit successful!")
        await db.refresh(password_reset)
        print(f"🔍 Refresh successful!")
        print(f"🔍 DEBUG: email_service = {email_service}")
        print(f"🔍 DEBUG: email_service is None? {email_service is None}")
        logger.info(f"Password reset record saved to database for {data.email}")
        
        # Send email with reset code
        if email_service:
            # Get user's name for personalized email
            username = user.username if user.username else "User"
            
            print(f"📧 DEBUG: About to send email to {data.email}")
            logger.info(f"Attempting to send email to {data.email}")
            # Send the email
            email_sent = email_service.send_password_reset_email(
                to_email=data.email,
                reset_code=reset_code,
                username=username
            )
            
            if email_sent:
                logger.info(f"✅ Password reset code sent to {data.email}")
            else:
                logger.warning(f"⚠️ Failed to send email to {data.email}, but code was generated: {reset_code}")
        else:
            # Email not configured - log the code (DEVELOPMENT ONLY)
            print(f"⚠️ Email service is None!")
            logger.warning(f"⚠️ Email not configured. Password reset code for {data.email}: {reset_code}")
        
        return {
            "message": "If the email exists, a reset code has been sent",
            "email": data.email,
            # Only include dev_code if email service is not configured
            **({"dev_code": reset_code} if not email_service else {})
        }
    
    except Exception as e:
        print(f"❌❌❌ EXCEPTION CAUGHT: {str(e)}")
        print(f"❌❌❌ Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        logger.error(f"Error in password reset request: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An error occurred processing your request")


@router.post("/password-reset/verify")
async def verify_reset_code(data: PasswordResetVerify, db: AsyncSession = Depends(get_db)):
    """
    Verify the reset code
    """
    # Find the most recent unused, non-expired code for this email
    result = await db.execute(
        select(PasswordReset).where(
            and_(
                PasswordReset.email == data.email,
                PasswordReset.reset_code == data.code,
                PasswordReset.is_used == False,
                PasswordReset.expires_at > datetime.utcnow()
            )
        ).order_by(PasswordReset.created_at.desc())
    )
    reset_record = result.scalar_one_or_none()
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code"
        )
    
    return {
        "message": "Code verified successfully",
        "email": data.email
    }


@router.post("/password-reset/complete")
async def complete_password_reset(data: PasswordResetComplete, db: AsyncSession = Depends(get_db)):
    """
    Complete password reset with verified code
    """
    # Find the most recent unused, non-expired code for this email
    result = await db.execute(
        select(PasswordReset).where(
            and_(
                PasswordReset.email == data.email,
                PasswordReset.reset_code == data.code,
                PasswordReset.is_used == False,
                PasswordReset.expires_at > datetime.utcnow()
            )
        ).order_by(PasswordReset.created_at.desc())
    )
    reset_record = result.scalar_one_or_none()
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code"
        )
    
    # Find user
    user_result = await db.execute(select(User).where(User.email == data.email))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(data.new_password)
    
    # Mark reset code as used
    reset_record.is_used = True
    
    await db.commit()
    
    return {"message": "Password reset successfully"}

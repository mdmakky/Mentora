"""
Pydantic schemas for User-related requests and responses
These define the shape of data for API endpoints
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, Dict


# Request schemas (what we receive from frontend)

class UserRegister(BaseModel):
    """Schema for user registration"""
    username: str
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None


class PasswordChange(BaseModel):
    """Schema for changing password"""
    old_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    """Schema for requesting password reset"""
    email: EmailStr


class PasswordResetVerify(BaseModel):
    """Schema for verifying reset code"""
    email: EmailStr
    code: str


class PasswordResetComplete(BaseModel):
    """Schema for completing password reset"""
    email: EmailStr
    code: str
    new_password: str


# Response schemas (what we send to frontend)

class UserResponse(BaseModel):
    """Schema for user data in responses"""
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True  # Allows SQLAlchemy models


class TokenResponse(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserStatistics(BaseModel):
    """Schema for user statistics"""
    total_documents: int = 0
    total_chat_sessions: int = 0
    total_pages: int = 0


class ProfileResponse(BaseModel):
    """Schema for complete profile response"""
    user: UserResponse
    statistics: UserStatistics

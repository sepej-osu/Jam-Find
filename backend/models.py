from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class ProfileBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = None

class ProfileCreate(ProfileBase):
    user_id: str = Field(..., description="Firebase Auth UID")

class ProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = None

class ProfileResponse(ProfileBase):
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

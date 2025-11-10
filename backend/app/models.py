from pydantic import BaseModel, EmailStr
from typing import Optional, List

class User(BaseModel):
    id: Optional[int] = None
    email: str
    first_name: str
    last_name: str
    disabled: bool = False
    roles: List[str] = []  # Added roles field

    class Config:
        from_attributes = True

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ProfileBase(BaseModel):
    bio: Optional[str] = None
    display_name: Optional[str] = None
    location: Optional[str] = None
    experience_level: Optional[str] = None  # Added experience_level field


class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

class Profile(ProfileBase):
    id: int
    user_id: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True





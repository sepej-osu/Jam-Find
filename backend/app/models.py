from pydantic import BaseModel, EmailStr
from typing import Optional, List

class User(BaseModel):
    id: Optional[int] = None
    email: str
    first_name: str
    last_name: str
    disabled: bool = False
    roles: List[str] = []  # Added roles field
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class UserInDB(User):
    hashed_password: str


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UpdatePassword(BaseModel):
    old_password: str
    new_password: str


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

    class Config:
        from_attributes = True

class Post(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    profile_id: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    title: str
    content: str


class MyPosts(BaseModel):
    posts: List[Post] = []





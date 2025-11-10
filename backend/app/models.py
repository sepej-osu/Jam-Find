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

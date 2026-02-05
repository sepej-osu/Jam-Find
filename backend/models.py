from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from typing import Optional, List
from datetime import datetime


class Location(BaseModel):
    place_id: Optional[str] = Field(None, alias="placeId")
    formatted_address: str = Field(..., alias="formattedAddress")
    lat: float
    lng: float
    
    model_config = ConfigDict(
        populate_by_name = True
    )

class Instrument(BaseModel):
    name: str
    experience_level: int = Field(..., ge=1, le=10, alias="experienceLevel")
    
    model_config = ConfigDict(
        populate_by_name = True
    )

class ProfileBase(BaseModel):
    email: EmailStr
    bio: Optional[str] = Field(None, max_length=500)
    gender: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, alias="experienceYears")
    location: Optional[Location] = None
    profile_pic_url: Optional[str] = Field(None, alias="profilePicUrl")
    instruments: Optional[List[Instrument]] = Field(default_factory=list)
    genres: Optional[List[str]] = Field(default_factory=list)
    
    model_config = ConfigDict(
        populate_by_name = True
    )


class ProfileCreate(ProfileBase):
    user_id: str = Field(..., description="Firebase Auth UID")


class ProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    bio: Optional[str] = Field(None, max_length=500)
    gender: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, alias="experienceYears")
    location: Optional[Location] = None
    profile_pic_url: Optional[str] = Field(None, alias="profilePicUrl")
    instruments: Optional[List[Instrument]] = None
    genres: Optional[List[str]] = None
    
    model_config = ConfigDict(
        populate_by_name = True
    )


class ProfileResponse(ProfileBase):
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        from_attributes = True,
        populate_by_name = True
    )

from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Profile models
class Gender(str, Enum):
    """To validate gender field."""
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non-binary"
    # TODO: Add decline to say and other options


class Location(BaseModel):
    place_id: Optional[str] = Field(default=None, alias="placeId")
    formatted_address: str = Field(..., alias="formattedAddress")
    lat: float
    lng: float
    
    model_config = ConfigDict(
        populate_by_name = True
    )

class Instrument(BaseModel):
    name: str
    experience_level: int = Field(..., ge=1, le=5, alias="experienceLevel")   # 1 to 5 scale
    
    model_config = ConfigDict(
        populate_by_name = True
    )

   # an elipses in the Field indicates a required field
class ProfileBase(BaseModel):
    user_id: str = Field(..., description="Firebase Auth UID", alias="userId")
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    birth_date: datetime = Field(..., alias="birthDate")
    gender: str = Field(..., alias="gender")  
    email: EmailStr
    bio: Optional[str] = Field(default=None, max_length=500, alias="bio")
    experience_years: Optional[int] = Field(default=None, ge=0, alias="experienceYears")
    location: Optional[Location] = Field(default=None, alias="location")
    profile_pic_url: Optional[str] = Field(default=None, alias="profilePicUrl")
    instruments: Optional[List[Instrument]] = Field(default_factory=list, alias="instruments")
    genres: Optional[List[str]] = Field(default_factory=list, alias="genres")
    
    model_config = ConfigDict(
        populate_by_name = True
    )


class ProfileCreate(ProfileBase):
    user_id: str = Field(..., description="Firebase Auth UID")


class ProfileUpdate(BaseModel):
    email: Optional[EmailStr] = Field(default=None, alias="email")
    first_name: Optional[str] = Field(default=None, alias="firstName")
    last_name: Optional[str] = Field(default=None, alias="lastName")
    bio: Optional[str] = Field(default=None, max_length=500, alias="bio")
    gender: Optional[Gender] = Field(default=None, alias="gender") 
    experience_years: Optional[int] = Field(default=None, ge=0, alias="experienceYears")
    location: Optional[Location] = Field(default=None, alias="location")
    profile_pic_url: Optional[str] = Field(default=None, alias="profilePicUrl")
    instruments: Optional[List[Instrument]] = Field(default=None, alias="instruments")
    genres: Optional[List[str]] = Field(default=None, alias="genres")
    
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

# Post models
class PostBase(BaseModel):
    user_id: str = Field(..., description="Firebase Auth UID", alias="userId")
    title: str = Field(..., max_length=100)
    body: str = Field(..., max_length=1000)
    post_type: str = Field(..., alias="postType")  # "looking_for_band", "looking_for_musicians", "looking_to_jam", "sharing_music"
    ## not sure on this one below
    #show_on_profile: bool = Field(default=True, alias="showOnProfile")
    location: Optional[Location] = None
    instruments: Optional[List[Instrument]] = Field(default_factory=list, alias="instruments")
    genres: Optional[List[str]] = Field(default_factory=list)
    media: Optional[List[HttpUrl]] = Field(default_factory=list, alias="media")  # List of media URLs (images, audio, video)
    liked_by: Optional[List[str]] = Field(default_factory=list, alias="likedBy")  # List of user IDs who liked the post
    # We can calculate the number of likes from the length of liked_by array, so we don't need a separate likes field.

    model_config = ConfigDict(
        populate_by_name = True
    )

# use the front end components
class PostCreate(BaseModel):
    title: str = Field(..., max_length=100)
    body: str = Field(..., max_length=1000)
    post_type: str = Field(..., alias="postType")
    location: Optional[Location] = None
    instruments: Optional[List[Instrument]] = Field(default_factory=list, alias="instruments")
    genres: Optional[List[str]] = Field(default_factory=list)
    media: Optional[List[HttpUrl]] = Field(default_factory=list, alias="media")  # List of media URLs (images, audio, video)
    liked_by: Optional[List[str]] = Field(default_factory=list, alias="likedBy")  # List of user IDs who liked the post
    
    model_config = ConfigDict(
        populate_by_name = True
    )
    
class PostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=100)
    body: Optional[str] = Field(default=None, max_length=1000)
    post_type: Optional[str] = Field(default=None, alias="postType")  # "looking_for_band", "looking_for_musicians", "looking_to_jam", "sharing_music"
    location: Optional[Location] = Field(default=None)
    instruments: Optional[List[Instrument]] = Field(default=None, alias="instruments")
    genres: Optional[List[str]] = Field(default=None, alias="genres")
    media: Optional[List[HttpUrl]] = Field(default=None, alias="media")  # List of media URLs (images, audio, video)
    # likes can only be modified through the /posts/{post_id}/like endpoint
    
    model_config = ConfigDict(
        populate_by_name = True
    )

class PostResponse(PostBase):
    post_id: str = Field(..., alias="postId")
    liked_by: Optional[List[str]] = Field(default_factory=list, exclude=True)  # Exclude from API response for privacy
    likes: int = Field(..., description="Computed from liked_by array length")
    liked_by_current_user: bool = Field(default=False, alias="likedByCurrentUser", description="Whether the current user has liked this post")
    edited: bool = Field(..., description="Boolean flag set to true when post is updated via PUT endpoint")
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        from_attributes = True,
        populate_by_name = True
    )

# Like models
class LikeResponse(BaseModel):
    """Response model for like/unlike operations"""
    post_id: str = Field(..., alias="postId")
    likes: int
    liked: bool  # True if user liked, False if user unliked
    message: str
    
    model_config = ConfigDict(
        populate_by_name = True
    )
from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class Gender(str, Enum):
    """To validate gender field."""
    PREFER_NOT_TO_SAY = "prefer_not_to_say"
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non-binary"
    NOT_LISTED = "not_listed"

class PostType(str, Enum):
    """To validate post_type field."""
    LOOKING_FOR_BAND = "looking_for_band"
    LOOKING_FOR_MUSICIANS = "looking_for_musicians"
    LOOKING_TO_JAM = "looking_to_jam"
    SHARING_MUSIC = "sharing_music"

class InstrumentType(str, Enum):
    """To validate instrument field."""
    ELECTRIC_GUITAR = "electric_guitar"
    ACOUSTIC_GUITAR = "acoustic_guitar"
    ELECTRIC_BASS = "electric_bass"
    DRUMS = "drums"
    PIANO = "piano"
    KEYBOARD = "keyboard"
    VOCALS = "vocals"
    DJ_PRODUCTION = "dj_production"
    TRUMPET = "trumpet"
    SAXOPHONE = "saxophone"
    OTHER = "other"

class Instrument(BaseModel):
    """Model for musical instruments with skill level, used in profiles and posts."""
    name: str = Field(..., alias="name", description="Name of the musical instrument")
    skill_level: int = Field(..., ge=1, le=5, alias="skillLevel", description="Skill level of the instrument from 1 to 5")
    model_config = ConfigDict(populate_by_name = True)

class GenreType(str, Enum):
    """To validate genre field."""
    ROCK = "rock"
    POP = "pop"
    JAZZ = "jazz"
    BLUES = "blues"
    COUNTRY = "country"
    RNB = "r_n_b"
    HIP_HOP = "hip_hop"
    HARDCORE = "hardcore"
    ELECTRONIC = "electronic"
    CLASSICAL = "classical"
    METAL = "metal"
    DEATH_METAL = "death_metal"
    FOLK = "folk"
    REGGAE = "reggae"
    PUNK = "punk"
    INDIE = "indie"
    SOUL = "soul"
    FUNK = "funk"
    LATIN = "latin"
    ALTERNATIVE = "alternative"
    GOSPEL = "gospel"
    EXPERIMENTAL = "experimental"
    OTHER = "other"

class Location(BaseModel):
    """Model for location data, used in both profiles and posts. Includes geocoding fields."""
    place_id: Optional[str] = Field(default=None, alias="placeId", description="Google Place ID for the location, used for geocoding and reverse geocoding")
    formatted_address: Optional[str] = Field(default=None, alias="formattedAddress", description="Formatted address of the location")
    lat: Optional[float] = Field(default=None, alias="lat", description="Latitude of the location")
    lng: Optional[float] = Field(default=None, alias="lng", description="Longitude of the location")
    geohash: Optional[str] = Field(default=None, alias="geohash", description="Geohash of the location for efficient querying")
    zip_code: Optional[str] = Field(default=None, alias="zipCode", description="Zip code for the location, used for resolving location from zip code")
    model_config = ConfigDict(populate_by_name = True)

class ProfileBase(BaseModel):
    """Base model for user profiles, used for both creation and response. Includes common fields and validation."""
    first_name: str = Field(..., alias="firstName", description="User's first name")
    last_name: str = Field(..., alias="lastName", description="User's last name")
    birth_date: Optional[datetime] = Field(default=None, alias="birthDate", description="User's birth date")
    gender: Optional[Gender] = Field(default=None, alias="gender", description="Gender of the user")
    bio: Optional[str] = Field(default=None, max_length=500, alias="bio", description="Short biography or description for the user's profile")
    experience_years: Optional[int] = Field(default=None, ge=0, alias="experienceYears", description="Number of years of musical experience")
    location: Optional[Location] = Field(default=None, alias="location", description="Location object with placeId, formattedAddress, lat, lng, and geohash")
    profile_pic_url: Optional[str] = Field(default=None, alias="profilePicUrl", description="URL to the user's profile picture")
    instruments: Optional[List[Instrument]] = Field(default_factory=list, alias="instruments", description="List of instruments with skill level")
    genres: Optional[List[str]] = Field(default_factory=list, alias="genres", description="List of music genres associated with the profile")
    model_config = ConfigDict(
        populate_by_name = True,
        from_attributes = True,
        extra = "ignore"
    )

class ProfileCreate(ProfileBase):
    """Model for creating a new profile. Inherits from ProfileBase and adds user_id field."""
    user_id: str = Field(..., alias="userId", description="Firebase Auth UID")
    email: EmailStr = Field(..., alias="email", description="User's email address")


class ProfileUpdate(BaseModel):
    """Model for updating a profile. All fields are optional to allow partial updates."""
    email: Optional[EmailStr] = Field(default=None, alias="email", description="User's email address")
    first_name: Optional[str] = Field(default=None, alias="firstName", description="User's first name")
    last_name: Optional[str] = Field(default=None, alias="lastName", description="User's last name")
    bio: Optional[str] = Field(default=None, max_length=500, alias="bio", description="Short biography or description for the user's profile")
    gender: Optional[Gender] = Field(default=None, alias="gender", description="Gender of the user")
    experience_years: Optional[int] = Field(default=None, ge=0, alias="experienceYears", description="Number of years of musical experience")
    location: Optional[Location] = Field(default=None, alias="location", description="Location object with placeId, formattedAddress, lat, lng, and geohash")
    profile_pic_url: Optional[str] = Field(default=None, alias="profilePicUrl", description="URL to the user's profile picture")
    instruments: Optional[List[Instrument]] = Field(default=None, alias="instruments", description="List of instruments with skill level")
    genres: Optional[List[str]] = Field(default=None, alias="genres", description="List of music genres associated with the profile")
    model_config = ConfigDict(populate_by_name = True)


class ProfileResponse(ProfileBase):
    """Response model for user profiles, includes additional fields like user_id and timestamps. Inherits from ProfileBase."""
    user_id: str = Field(..., alias="userId", description="Firebase Auth UID")
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")
    model_config = ConfigDict(
        from_attributes = True,
        populate_by_name = True,
        extra = "ignore"
    )

class PostBase(BaseModel):
    """Base model for posts, used for both creation and response. Includes common fields and validation."""
    title: str = Field(..., max_length=100, alias="title", description="Title of the post")
    body: str = Field(..., max_length=1000, alias="body", description="Content of the post")
    post_type: PostType = Field(..., alias="postType", description="Type of post")
    location: Optional[Location] = Field(default=None, alias="location", description="Location object with placeId, formattedAddress, lat, lng, and geohash")
    instruments: Optional[List[Instrument]] = Field(default_factory=list, alias="instruments", description="List of instruments associated with the post.")
    genres: Optional[List[str]] = Field(default_factory=list, alias="genres", description="List of music genres associated with the post")
    media: Optional[List[HttpUrl]] = Field(default_factory=list, alias="media", description="List of media URLs (images, audio, video)")

    model_config = ConfigDict(populate_by_name = True)

class PostCreate(PostBase):
    """Model for creating a new post. Inherits from PostBase"""
    pass
    
class PostUpdate(BaseModel):
    """All fields are optional for updates. Only provided fields will be updated."""
    title: Optional[str] = Field(default=None, max_length=100, alias="title", description="Title of the post")
    body: Optional[str] = Field(default=None, max_length=1000, alias="body", description="Content of the post")
    post_type: Optional[PostType] = Field(default=None, alias="postType", description="Type of post")
    location: Optional[Location] = Field(default=None, alias="location", description="Location object with placeId, formattedAddress, lat, and lng")
    instruments: Optional[List[Instrument]] = Field(default=None, alias="instruments", description="List of instruments associated with the post.")
    genres: Optional[List[str]] = Field(default=None, alias="genres", description="List of music genres associated with the post")
    media: Optional[List[HttpUrl]] = Field(default=None, alias="media", description="List of media URLs (images, audio, video)")
    
    model_config = ConfigDict(
        populate_by_name = True
    )

class PostResponse(PostBase):
    """Response model for posts, includes additional fields like post_id, user_id, likes count, and timestamps."""
    post_id: str = Field(..., alias="postId", description="Unique identifier for the post")
    user_id: str = Field(..., alias="userId", description="Firebase Auth UID of the post creator")
    first_name: str = Field(..., alias="firstName", description="First name of the post creator")
    last_name: str = Field(..., alias="lastName", description="Last name of the post creator")
    profile_pic_url: Optional[str] = Field(default=None, alias="profilePicUrl", description="URL to the post creator's profile picture")
    liked_by: Optional[List[str]] = Field(default_factory=list, exclude=True, alias="likedBy", description="List of user IDs who liked the post")  # Exclude from API response for privacy
    likes: int = Field(..., alias="likes", description="Computed from liked_by array length")
    liked_by_current_user: bool = Field(default=False, alias="likedByCurrentUser", description="Whether the current user has liked this post")
    edited: bool = Field(..., alias="edited", description="Boolean flag set to true when the post has been modified after creation")
    created_at: datetime = Field(..., alias="createdAt", description="Timestamp of when the post was created")
    updated_at: datetime = Field(..., alias="updatedAt", description="Timestamp of the last update to the post")
    
    model_config = ConfigDict(
        from_attributes = True,
        populate_by_name = True
    )

class LikeResponse(BaseModel):
    """Response model for like/unlike operations"""
    post_id: str = Field(..., alias="postId", description="Unique identifier for the post that was liked or unliked")
    likes: int = Field(..., alias="likes", description="Updated total number of likes for the post")
    liked: bool = Field(..., alias="liked", description="Whether the post is now liked by the user after the toggle operation")
    message: str = Field(..., alias="message", description="Message describing the like/unlike operation")
    
    model_config = ConfigDict(
        populate_by_name = True
    )

class PaginatedPostsResponse(BaseModel):
    """Response model for paginated list of posts"""
    posts: List[PostResponse] = Field(..., alias="posts", description="List of posts for the current page")
    next_page_token: Optional[str] = Field(default=None, alias="nextPageToken", description="Token to retrieve the next page of results, if any")
    
    model_config = ConfigDict(
        populate_by_name = True
    )
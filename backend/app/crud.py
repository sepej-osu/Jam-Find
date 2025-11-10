from sqlalchemy.orm import Session
from database import DBUser, DBRole, DBProfile, DBPost
from models import UserCreate, ProfileUpdate, UserUpdate, Post, MyPosts, PostCreate, Profile
from passlib.context import CryptContext
from auth import convert_db_user_to_user


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str):
    """Hash a password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_email(db: Session, email: str):
    """Get user by email."""
    return db.query(DBUser).filter(DBUser.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    """Get user by ID."""
    return db.query(DBUser).filter(DBUser.id == user_id).first()


def create_user(db: Session, user: UserCreate):
    """Create a new user."""
    hashed_password = get_password_hash(user.password)
    db_user = DBUser(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        hashed_password=hashed_password,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    db_profile = DBProfile(
        user_id=db_user.id,
        bio="",
        display_name=user.first_name,
        location="",
        experience_level=""
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)

    return db_user


def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user by email and password."""
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


# Role-related functions
def get_role_by_name(db: Session, name: str):
    """Get role by name."""
    return db.query(DBRole).filter(DBRole.name == name).first()


def create_role(db: Session, name: str, description: str):
    """Create a new role."""
    db_role = DBRole(name=name, description=description)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role


def assign_role_to_user(db: Session, user_id: int, role_name: str):
    """Assign a role to a user."""
    user = get_user_by_id(db, user_id)
    role = get_role_by_name(db, role_name)
    
    if user and role:
        if role not in user.roles:
            user.roles.append(role)
            db.commit()
            return True
    return False


def get_profile_by_user_id(db: Session, user_id: int):
    """Get profile by user ID."""
    return db.query(DBProfile).filter(DBProfile.user_id == user_id).first()


def update_profile(db: Session, user_id: int, profile_update: ProfileUpdate):
    """Update a user's profile."""
    db_profile = get_profile_by_user_id(db, user_id)
    if db_profile:
        update_data = profile_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_profile, key, value)
        db.commit()
        db.refresh(db_profile)
    return db_profile


def update_user(db: Session, user_id: int, user_update: UserUpdate):
    pass


def update_password(db: Session, user_id: int, old_password: str, new_password: str):
    """Update a user's password."""
    user = get_user_by_id(db, user_id)
    if user and verify_password(old_password, user.hashed_password):
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        return True
    return False


def create_post(db: Session, post: PostCreate, profile_id: int) -> DBPost:
    """Create a new post."""
    db_post = DBPost(
        title=post.title,
        content=post.content,
        profile_id=profile_id,
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post



def get_posts_by_profile_id(db: Session, profile_id: int):
    """Get posts by profile ID."""
    return db.query(DBPost).filter(DBPost.profile_id == profile_id).all()






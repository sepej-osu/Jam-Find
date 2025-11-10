from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func

# Database URL - SQLite for development
DATABASE_URL = "sqlite:///./auth.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Association table for many-to-many relationship between users and roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    roles = relationship("DBRole", secondary=user_roles, back_populates="users")
    profile = relationship("DBProfile", uselist=False, back_populates="user")


class DBRole(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)

    users = relationship("DBUser", secondary=user_roles, back_populates="roles")

class DBProfile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    bio = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)  # Added experience_level column
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("DBUser", back_populates="profile")
    

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

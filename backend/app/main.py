import sys
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta

from sqlalchemy.orm import Session
from database import get_db
import crud
from auth import (
    create_access_token, get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from models import User, UserCreate, Token


app = FastAPI()

# CORS origins
ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def get_message():
    return {"Message": "Hello from FastAPI."}


@app.post("/register", response_model=User)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = crud.create_user(db=db, user=user)
    return User(
        id=new_user.id,
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        disabled=not new_user.is_active,
        roles=[role.name for role in new_user.roles]
    )


@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """Authenticate user and return access token."""
    # OAuth2PasswordRequestForm uses 'username' field, but we'll treat it as email
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},  # Using email as the subject
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user


@app.get("/protected")
async def protected_route(current_user: User = Depends(get_current_active_user)):
    """Protected route example."""
    return {
        "message": f"Hello {current_user.first_name} {current_user.last_name}, this is a protected route!",
        "email": current_user.email
    }


if __name__ == "__main__":
    print(f"By default reload state is False.")
    print("Available CLI argument: Reload state (True/False)")

    args = sys.argv[1:]
    reload = False

    if len(args) == 1:
        if args[0].lower() == 'true':
            reload = True
    print(f"Reload State: {reload}")

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload)
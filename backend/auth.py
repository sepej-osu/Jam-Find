from fastapi import Header, HTTPException, status
from firebase_admin import auth
from typing import Optional


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Verify Firebase ID token from the frontend and return the user's UID.
    
    The frontend should send the token in the Authorization header as:
    Authorization: Bearer <firebase_id_token>
    
    Usage in routes:
        current_user_id: str = Depends(get_current_user)
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Extract token from "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = parts[1]
    
    try:
        # Verify the Firebase ID token using Firebase Admin SDK
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        return user_id
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has been revoked",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


def verify_user_access(authenticated_user_id: str, resource_user_id: str):
    """
    Verify that the authenticated user is accessing their own resource.
    
    Raises 403 Forbidden if the user tries to access another user's resource.
    
    Args:
        authenticated_user_id: The UID from the verified Firebase token
        resource_user_id: The user_id of the resource being accessed
    """
    if authenticated_user_id != resource_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resource"
        )

def verify_user_logged_in(authenticated_user_id: Optional[str]):
    """
    Verify that the user is logged in.
    
    Raises 401 Unauthorized if there is no authenticated user.
    
    Args:
        authenticated_user_id: The UID from the verified Firebase token
    """
    if not authenticated_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access this resource",
            headers={"WWW-Authenticate": "Bearer"}
        )

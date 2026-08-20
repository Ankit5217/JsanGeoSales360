from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.auth import authenticate_user, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    user = authenticate_user(payload.username, payload.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_access_token(user["username"], user["role"])

    return LoginResponse(
        access_token=token,
        username=user["username"],
        role=user["role"]
    )

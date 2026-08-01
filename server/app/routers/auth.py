from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..auth import create_access_token, hash_password, verify_password
from ..database import get_session
from ..dependencies import get_current_user
from ..models import User
from ..schemas import AuthResponse, MeResponse, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


def to_user_read(user: User) -> UserRead:
    return UserRead(id=user.id, name=user.name, email=user.email)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, session: Annotated[Session, Depends(get_session)]):
    existing_user = session.exec(select(User).where(User.email == payload.email)).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = User(name=payload.name, email=payload.email, password_hash=hash_password(payload.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    return AuthResponse(token=create_access_token(user.id), user=to_user_read(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, session: Annotated[Session, Depends(get_session)]):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect")

    return AuthResponse(token=create_access_token(user.id), user=to_user_read(user))


@router.get("/me", response_model=MeResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]):
    return MeResponse(user=to_user_read(current_user))

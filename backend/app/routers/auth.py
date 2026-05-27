from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
import os, bcrypt as _bcrypt

from ..database import get_db
from ..models import UserModel

SECRET_KEY = os.getenv("JWT_SECRET", "ticket-system-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

security = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "master"
    full_name: Optional[str] = ""


class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = ""
    role: str = "master"


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: str
    is_active: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: int, role: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "role": role, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserModel:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except:
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user = db.query(UserModel).filter(UserModel.id == user_id, UserModel.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


def require_admin(user: UserModel = Depends(get_current_user)) -> UserModel:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Требуются права администратора")
    return user


@router.get("/init")
def check_init(db: Session = Depends(get_db)):
    count = db.query(UserModel).count()
    return {"initialized": count > 0}


@router.post("/init")
def init_admin(db: Session = Depends(get_db)):
    if db.query(UserModel).count() > 0:
        raise HTTPException(400, "Система уже инициализирована")
    admin = UserModel(
        username="Administrator",
        password_hash=hash_password("dgduhrt"),
        role="admin",
        full_name="Главный администратор",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    return {"message": "Администратор создан", "username": "Administrator", "password": "dgduhrt"}


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверное имя или пароль")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Пользователь заблокирован")
    token = create_token(user.id, user.role)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/register", response_model=UserResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if not req.username or not req.username.strip():
        raise HTTPException(400, "Имя пользователя не может быть пустым")
    if not req.password:
        raise HTTPException(400, "Пароль не может быть пустым")
    existing = db.query(UserModel).filter(UserModel.username == req.username).first()
    if existing:
        raise HTTPException(400, "Пользователь с таким именем уже существует")
    user = UserModel(
        username=req.username.strip(),
        password_hash=hash_password(req.password),
        role=req.role,
        full_name=(req.full_name or "").strip() or req.username.strip(),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
def me(user: UserModel = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.post("/users", response_model=UserResponse)
def create_user(req: CreateUserRequest, admin: UserModel = Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(UserModel).filter(UserModel.username == req.username).first()
    if existing:
        raise HTTPException(400, "Пользователь с таким именем уже существует")
    user = UserModel(
        username=req.username,
        password_hash=hash_password(req.password),
        role=req.role,
        full_name=req.full_name,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


class UpdateUserRequest(BaseModel):
    password: str | None = None
    role: str | None = None
    full_name: str | None = None
    is_active: bool | None = None


@router.get("/users", response_model=list[UserResponse])
def list_users(admin: UserModel = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, req: UpdateUserRequest, admin: UserModel = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if req.password:
        user.password_hash = hash_password(req.password)
    if req.role is not None:
        user.role = req.role
    if req.full_name is not None:
        user.full_name = req.full_name
    if req.is_active is not None:
        user.is_active = req.is_active
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: UserModel = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if user.id == admin.id:
        raise HTTPException(400, "Нельзя удалить самого себя")
    db.delete(user)
    db.commit()
    return {"message": "Пользователь удалён"}

"""Authentication router: login, JWT utilities, and current-user dependency."""
from datetime import datetime, timedelta
from typing import Optional
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Form, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from ..db import get_db
from .. import crud, schemas, models
from ..email_utils import send_reset_email

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "changeme")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """FastAPI dependency: decode JWT, validate, and return the authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        employee_code: str = payload.get("sub")
        if employee_code is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = crud.get_user_by_employee_code(db, employee_code=employee_code)
    if user is None:
        raise credentials_exception
    if user.is_active != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    return user


@router.post("/login", response_model=schemas.TokenResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user by employee_code and password.
    Returns a JWT access token along with the user profile.
    """
    user = crud.get_user_by_employee_code(db, employee_code=request.employee_code)
    if not user or not crud.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid employee code or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.is_active != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    access_token = create_access_token(
        data={"sub": user.employee_code},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # Build user response with roles
    roles = crud.get_user_roles(db, user.id)
    user_data = schemas.UserResponse(
        id=user.id,
        employee_code=user.employee_code,
        full_name=user.full_name,
        email=user.email,
        is_active=int(user.is_active),
        is_admin=int(user.is_admin),
        created_at=user.created_at,
        updated_at=user.updated_at,
        roles=[
            schemas.RoleResponse(
                id=r.id,
                name=r.name,
                description=r.description,
                is_active=r.is_active,
                created_at=r.created_at,
            )
            for r in roles
        ],
    )

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_data,
    )


@router.post("/change-password")
def change_password(
    req: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for the currently logged-in user."""
    if not crud.verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="รหัสผ่านปัจจุบันไม่ถูกต้อง")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร")
    current_user.hashed_password = crud.get_password_hash(req.new_password)
    db.commit()
    return {"message": "เปลี่ยนรหัสผ่านสำเร็จ"}


@router.post("/forgot-password")
def forgot_password(
    req: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Send a password reset link to the user's registered email."""
    user = crud.get_user_by_employee_code(db, req.employee_code)
    # Always return success to prevent user enumeration
    if not user or not user.email:
        return {"message": "หากมี email ในระบบ ระบบได้ส่งลิงก์รีเซ็ตให้แล้ว"}

    # Invalidate old tokens
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False,
    ).update({"used": True})

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=30)
    db.add(models.PasswordResetToken(user_id=user.id, token=token, expires_at=expires))
    db.commit()

    background_tasks.add_task(send_reset_email, user.email, user.full_name, token)
    return {"message": "หากมี email ในระบบ ระบบได้ส่งลิงก์รีเซ็ตให้แล้ว"}


@router.post("/reset-password")
def reset_password(
    req: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using a valid token from email."""
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == req.token,
        models.PasswordResetToken.used == False,
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="ลิงก์ไม่ถูกต้องหรือถูกใช้ไปแล้ว")
    if datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=400, detail="ลิงก์หมดอายุแล้ว กรุณาขอใหม่")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")

    user = db.query(models.User).filter(models.User.id == record.user_id).first()
    user.hashed_password = crud.get_password_hash(req.new_password)
    record.used = True
    db.commit()
    return {"message": "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบ"}

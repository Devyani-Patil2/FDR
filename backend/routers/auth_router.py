from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole
from schemas import Token, LoginRequest, UserCreate, UserOut
from auth import verify_password, get_password_hash, create_access_token, get_current_user, require_role

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(form: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")
    token = create_access_token(data={"sub": user.username, "role": user.role.value})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        institution_id=current_user.institution_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@router.post("/register", response_model=UserOut)
def register_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"])),
):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    try:
        role = UserRole(data.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {data.role}")

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=role,
        institution_id=data.institution_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        institution_id=user.institution_id,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER", "VERIFIER", "APPROVER", "AUDITOR"])),
):
    users = db.query(User).all()
    return [
        UserOut(
            id=u.id, username=u.username, email=u.email, full_name=u.full_name,
            role=u.role.value, institution_id=u.institution_id,
            is_active=u.is_active, created_at=u.created_at,
        )
        for u in users
    ]

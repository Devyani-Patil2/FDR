from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Institution, InstitutionStatus, User, Deposit, UserRole
from schemas import InstitutionCreate, InstitutionUpdate, InstitutionOut
from auth import get_current_user, require_role
from utils import log_audit

router = APIRouter(prefix="/api/institutions", tags=["Institutions"])


def _to_out(inst: Institution, db: Session) -> InstitutionOut:
    count = db.query(Deposit).filter(Deposit.institution_id == inst.id).count()
    return InstitutionOut(
        id=inst.id, institution_id=inst.institution_id, name=inst.name,
        region=inst.region, status=inst.status.value, contact_email=inst.contact_email,
        contact_phone=inst.contact_phone, address=inst.address,
        created_at=inst.created_at, updated_at=inst.updated_at,
        deposit_count=count,
    )


@router.get("", response_model=list[InstitutionOut])
@router.get("/", response_model=list[InstitutionOut])
def list_institutions(
    search: str = Query(None),
    region: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Institution)
    if current_user.role == UserRole.INSTITUTION:
        q = q.filter(Institution.id == current_user.institution_id)

    if search:
        q = q.filter(
            (Institution.name.ilike(f"%{search}%")) | (Institution.institution_id.ilike(f"%{search}%"))
        )
    if region:
        q = q.filter(Institution.region == region)
    if status:
        q = q.filter(Institution.status == status)
    institutions = q.order_by(Institution.name).all()
    return [_to_out(i, db) for i in institutions]


@router.post("", response_model=InstitutionOut)
@router.post("/", response_model=InstitutionOut)
def create_institution(
    data: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER"])),
):
    if db.query(Institution).filter(Institution.institution_id == data.institution_id).first():
        raise HTTPException(status_code=400, detail="Institution ID already exists")

    inst = Institution(
        institution_id=data.institution_id, name=data.name, region=data.region,
        contact_email=data.contact_email, contact_phone=data.contact_phone,
        address=data.address,
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    log_audit(db, current_user.username, "INSTITUTION_CREATED", "Institution",
              inst.institution_id, after_value={"name": inst.name, "region": inst.region})
    return _to_out(inst, db)


@router.get("/{inst_id}", response_model=InstitutionOut)
def get_institution(inst_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.INSTITUTION and inst_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied: You can only view your own institution's profile.")
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return _to_out(inst, db)


@router.put("/{inst_id}", response_model=InstitutionOut)
def update_institution(
    inst_id: int, data: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER"])),
):
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    before = {"name": inst.name, "region": inst.region, "status": inst.status.value}
    if data.name is not None:
        inst.name = data.name
    if data.region is not None:
        inst.region = data.region
    if data.status is not None:
        inst.status = InstitutionStatus(data.status)
    if data.contact_email is not None:
        inst.contact_email = data.contact_email
    if data.contact_phone is not None:
        inst.contact_phone = data.contact_phone
    if data.address is not None:
        inst.address = data.address

    db.commit()
    db.refresh(inst)
    after = {"name": inst.name, "region": inst.region, "status": inst.status.value}
    log_audit(db, current_user.username, "INSTITUTION_UPDATED", "Institution",
              inst.institution_id, before_value=before, after_value=after)
    return _to_out(inst, db)

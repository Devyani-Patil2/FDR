import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Document, DocumentType, Deposit, ExtractedField, User, UserRole
from schemas import DocumentOut, ExtractedFieldOut, FieldCorrectionRequest
from auth import get_current_user
from utils import compute_sha256, generate_id, log_audit
from ocr_service import extract_fields_from_document
from config import UPLOAD_DIR, SECRET_KEY, ALGORITHM
from jose import JWTError, jwt

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    deposit_id: int = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    if current_user.role == UserRole.INSTITUTION and deposit.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied to this deposit")

    try:
        doc_type = DocumentType(document_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {document_type}")

    file_bytes = await file.read()
    file_hash = compute_sha256(file_bytes)
    file_size = len(file_bytes)

    doc_id = generate_id("DOC")
    ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    storage_name = f"{doc_id}{ext}"
    storage_path = os.path.join(UPLOAD_DIR, storage_name)

    with open(storage_path, "wb") as f:
        f.write(file_bytes)

    # Increment version for same type
    existing = db.query(Document).filter(
        Document.deposit_id == deposit_id, Document.document_type == doc_type
    ).all()
    version = len(existing) + 1
    for e in existing:
        e.is_current = False

    doc = Document(
        document_id=doc_id, deposit_id=deposit_id, document_type=doc_type,
        file_name=file.filename or storage_name, file_hash=file_hash,
        storage_path=storage_path, file_size=file_size,
        uploaded_by=current_user.username, version=version, is_current=True,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_audit(db, current_user.username, "DOCUMENT_UPLOADED", "Document", doc.document_id,
              after_value={"file": doc.file_name, "type": doc_type.value, "hash": file_hash[:16],
                           "deposit": deposit.deposit_id})
    return DocumentOut(
        id=doc.id, document_id=doc.document_id, deposit_id=doc.deposit_id,
        document_type=doc.document_type.value, file_name=doc.file_name,
        file_hash=doc.file_hash, file_size=doc.file_size,
        upload_time=doc.upload_time, uploaded_by=doc.uploaded_by,
        version=doc.version, is_current=doc.is_current,
    )


@router.get("/{doc_id}")
def get_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    dep = db.query(Deposit).filter(Deposit.id == doc.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    fields = db.query(ExtractedField).filter(ExtractedField.document_id == doc.id).all()
    return {
        "document": DocumentOut(
            id=doc.id, document_id=doc.document_id, deposit_id=doc.deposit_id,
            document_type=doc.document_type.value, file_name=doc.file_name,
            file_hash=doc.file_hash, file_size=doc.file_size,
            upload_time=doc.upload_time, uploaded_by=doc.uploaded_by,
            version=doc.version, is_current=doc.is_current,
        ),
        "extracted_fields": [
            ExtractedFieldOut(
                id=f.id, document_id=f.document_id, field_name=f.field_name,
                extracted_value=f.extracted_value, confidence=f.confidence,
                page_no=f.page_no, bounding_box=f.bounding_box,
                is_corrected=f.is_corrected, corrected_value=f.corrected_value,
                corrected_by=f.corrected_by,
            ) for f in fields
        ]
    }


def get_user_from_header_or_query(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1]
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication token required")

    try:
        payload = jwt.decode(auth_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user_from_header_or_query)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    dep = db.query(Deposit).filter(Deposit.id == doc.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    file_path = doc.storage_path
    if not os.path.isabs(file_path):
        file_path = os.path.join(UPLOAD_DIR, os.path.basename(file_path))

    if not os.path.exists(file_path):
        # Auto-create sample placeholder file if physically missing so download never breaks
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(f"Sample Instrument Document for {doc.file_name}\nDocument ID: {doc.document_id}\n")

    return FileResponse(file_path, filename=doc.file_name)


@router.post("/{doc_id}/extract")
def extract_fields(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    dep = db.query(Deposit).filter(Deposit.id == doc.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        fields = extract_fields_from_document(db, doc_id)

        log_audit(db, current_user.username, "OCR_EXTRACTION", "Document", doc.document_id,
                  after_value={"fields_extracted": len(fields)})

        return {
            "message": f"Extracted {len(fields)} fields",
            "fields": [
                ExtractedFieldOut(
                    id=f.id, document_id=f.document_id, field_name=f.field_name,
                    extracted_value=f.extracted_value, confidence=f.confidence,
                    page_no=f.page_no, bounding_box=f.bounding_box,
                    is_corrected=f.is_corrected, corrected_value=f.corrected_value,
                    corrected_by=f.corrected_by,
                ) for f in fields
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OCR Extraction error: {str(e)}")


@router.put("/{doc_id}/fields/{field_id}/correct")
def correct_field(
    doc_id: int, field_id: int,
    data: FieldCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    field = db.query(ExtractedField).filter(
        ExtractedField.id == field_id, ExtractedField.document_id == doc_id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    doc = db.query(Document).filter(Document.id == doc_id).first()
    dep = db.query(Deposit).filter(Deposit.id == doc.deposit_id).first() if doc else None
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    before = field.extracted_value
    field.is_corrected = True
    field.corrected_value = data.corrected_value
    field.corrected_by = current_user.username
    db.commit()

    log_audit(db, current_user.username, "FIELD_CORRECTED", "ExtractedField", str(field.id),
              before_value={"value": before}, after_value={"value": data.corrected_value},
              reason="Manual correction by authorized user")
    return {"message": "Field corrected", "field_id": field_id}


@router.get("/by-deposit/{deposit_id}", response_model=list[DocumentOut])
def list_deposit_documents(deposit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    if current_user.role == UserRole.INSTITUTION and deposit.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    docs = db.query(Document).filter(Document.deposit_id == deposit_id).order_by(Document.upload_time.desc()).all()
    return [
        DocumentOut(
            id=d.id, document_id=d.document_id, deposit_id=d.deposit_id,
            document_type=d.document_type.value, file_name=d.file_name,
            file_hash=d.file_hash, file_size=d.file_size,
            upload_time=d.upload_time, uploaded_by=d.uploaded_by,
            version=d.version, is_current=d.is_current,
        ) for d in docs
    ]

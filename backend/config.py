import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SECRET_KEY = os.getenv("SECRET_KEY", "fdr-guardian-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "fdr_guardian.db").replace("\\", "/")
DATABASE_URL = f"sqlite:///{DB_PATH}"

os.makedirs(UPLOAD_DIR, exist_ok=True)


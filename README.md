# BUTIR

Sistem penyusunan dan validasi butir soal ujian berbasis Taksonomi Bloom menggunakan deliberasi multi-agen kecerdasan buatan.

## Prasyarat Sistem

- Node.js 18+ dan pnpm
- Python 3.11+

## Panduan Instalasi

### 1. Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
pnpm install
copy .env.local.example .env.local
pnpm dev
```

## Akses Layanan

- Antarmuka Pengguna: http://localhost:3000
- Dokumentasi API: http://localhost:8000/docs

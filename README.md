# BUTIR — Sistem Penyusunan & Validasi Butir Soal via Debat Multi-Agen AI

## Prasyarat

- Node.js 18+ & pnpm (`npm install -g pnpm`)
- Python 3.11+

## 1. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

# Salin .env.example → .env dan isi API key Groq & SambaNova
copy .env.example .env    # Windows
# cp .env.example .env    # Linux/Mac

# Jalankan migrasi (otomatis buat file SQLite butir.db)
alembic upgrade head

# Jalankan server
uvicorn app.main:app --reload --port 8000
```

## 2. Frontend

```bash
cd frontend
pnpm install

# Salin .env.local.example → .env.local
copy .env.local.example .env.local    # Windows

pnpm dev
```

## 3. Akses

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

## 4. Database

**Development** (default): SQLite — file `backend/butir.db`, tanpa install apa-apa.

**Production**: PostgreSQL 15+ via Docker:
```bash
docker compose up -d
```
Lalu ubah `DATABASE_URL` di `.env`:
```
DATABASE_URL=postgresql+asyncpg://butir:butir@localhost:5432/butir
```
Dan install driver: `pip install asyncpg`

## 5. API Keys

Untuk menjalankan pipeline debat AI, isi di `backend/.env`:
```
GROQ_API_KEY=gsk_xxxxx
SAMBANOVA_API_KEY=xxxxx
```

## 6. Alur Penggunaan

1. Register/Login sebagai guru
2. Upload materi ajar (file .txt)
3. Buat kisi-kisi (distribusi Bloom total 100%)
4. Trigger generasi → 4 agen AI berdebat per butir soal
5. Review butir yang ditandai
6. Rakit paket ujian dari bank soal
7. Terbitkan ujian → dapat kode akses
8. Siswa buka `/akses-ujian/{kodeAkses}`, masukkan nama, kerjakan
9. Guru lihat laporan analisis (tingkat kesukaran + daya beda)

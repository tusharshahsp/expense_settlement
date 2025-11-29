# Development Environment Guide

This document focuses solely on developer workflows using local dependencies (SQLite/file storage, S3 emulation via filesystem, etc.). For production instructions see `docs/PROD.md`.

## Backend (FastAPI)

```bash
cd backend
chmod -R u+rwX data media app      # ensure the local user can write to data/media
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export APP_ENV=dev
uvicorn app.main:app --reload --port 8000
```

Notes:
- File storage is used automatically (`backend/data/users.json`, `backend/media`), no MySQL/S3 needed.
- The user running uvicorn must have write permission to `data/` and `media/`.
- Health check lives at `/health`, Swagger docs at `/docs`.

## Frontend (Vite + React)

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

## Tests

- Backend: `cd backend && python3 -m pytest`
- Frontend: `cd frontend && npm test -- --run`
- Terraform (syntax/unit): `cd infra && TF_CLI_ARGS_init=-backend=false terraform test` (still needs AWS credentials)

See `docs/LOCAL_DEV.md` for the more detailed matrix (environment variables, Terraform tips, etc.).

# Local Development Guide

This document consolidates the configuration steps for running every component locally.

## Prerequisites

- Python 3.9+, Node.js 18+, Terraform 1.6+, AWS CLI (optional), MySQL 8.x (optional)

## Backend (FastAPI)

```bash
cd backend
chmod -R u+rwX data media app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### File-storage mode (default)

```bash
export APP_ENV=dev
uvicorn app.main:app --reload
```

- Users, groups, and avatars are stored under `backend/data/` and `backend/media/`; confirm the user running the API can write to those directories.
- API available at http://localhost:8000 with Swagger docs at `/docs`.

### MySQL + S3 (production parity)

```bash
export APP_ENV=prod
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_USER=expense_app
export DB_PASSWORD=supersecret
export DB_NAME=expense_settlement
export MEDIA_S3_BUCKET=expense-app-media
export MEDIA_S3_BASE_URL=https://expense-app-media.s3.amazonaws.com
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Run `backend/db/schema.sql` to provision the database if needed.
- `MEDIA_S3_BUCKET` toggles S3 uploads; omit it to use filesystem storage even in prod mode.

## Frontend (Vite + React)

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

- Dev server listens on http://localhost:5173.
- Builds via `npm run build` and preview with `npm run preview`.

## Infrastructure (Terraform)

Prereqs: AWS credentials exported (Access Key, Secret, optional Session Token) and the remote state bucket/DynamoDB table created via `infra/state-bootstrap`.

```bash
cd infra
terraform init         # configures the remote S3 backend
terraform plan \
  -var="domain_name=app.local" \
  -var="hosted_zone_id=Z0000000000" \
  -var='container_images={frontend="nginx:alpine",backend="tiangolo/uvicorn-gunicorn-fastapi:python3.11"}'
terraform apply ...
```

### Tests / validation

- Backend: `cd backend && python3 -m pytest`
- Frontend: `cd frontend && npm test -- --run`
- Terraform: `cd infra && TF_CLI_ARGS_init=-backend=false terraform test`
  - Still requires AWS credentials because Terraform’s AWS provider validates access even for dry runs.

## Useful environment variables

| Variable           | Component | Default                | Description |
|--------------------|-----------|------------------------|-------------|
| `APP_ENV`          | Backend   | `dev`                  | Switches between file storage and MySQL/S3. |
| `USE_FILE_STORAGE` | Backend   | `true` when `dev`      | Force file storage (override per tests). |
| `DATA_FILE_PATH`   | Backend   | `backend/data/users.json` | Path for local user records. |
| `GROUPS_FILE_PATH` | Backend   | `backend/data/groups.json` | Path for local group data. |
| `MEDIA_ROOT`       | Backend   | `backend/media`        | Filesystem avatar root. |
| `MEDIA_S3_BUCKET`  | Backend   | unset                  | When set, uploads go to S3. |
| `VITE_API_BASE_URL`| Frontend  | `http://localhost:8000`| API base URL. |
| `AWS_REGION`       | Terraform | `us-east-1`            | Region for infra and S3 uploads. |

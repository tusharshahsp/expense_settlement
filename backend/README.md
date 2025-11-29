# Backend service (FastAPI)

The backend is a FastAPI application that can run entirely in file-storage mode for local development or switch to MySQL + S3 when `APP_ENV=prod`.

## Prerequisites

- Python 3.9+
- (Optional) MySQL 8.x for production mode
- AWS credentials if you want to push avatars to S3 locally

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Running (local file storage)

```bash
export APP_ENV=dev
uvicorn app.main:app --reload --port 8000
```

Users, groups, and avatars will be stored under `backend/data` and `backend/media`.

## Running (MySQL + S3)

```bash
export APP_ENV=prod
export DB_HOST=your-db-host
export DB_PORT=3306
export DB_USER=expense_app
export DB_PASSWORD=supersecret
export DB_NAME=expense_settlement
export MEDIA_S3_BUCKET=expense-app-media
export MEDIA_S3_BASE_URL=https://expense-app-media.s3.amazonaws.com  # optional CDN/CloudFront URL
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

When `MEDIA_S3_BUCKET` is set, avatar uploads stream directly to S3 and the API returns the public object URL instead of `/media/...`.

## Tests

```bash
cd backend
python3 -m pytest
```

The test suite boots the app against the file-storage adapters, so it does not require MySQL or S3. Some integration tests use FastAPI's `TestClient` to exercise real endpoints end-to-end.

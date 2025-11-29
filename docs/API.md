# API Reference (FastAPI backend)

Base URL defaults to `http://localhost:8000` in dev. In production, requests are routed through the Application Load Balancer (`https://<domain>`).

> The backend ships with auto-generated OpenAPI/Swagger docs at `/docs` and `/openapi.json`. This file captures the key resources for quick reference.

## Authentication

Stateless JSON responses are returned; the sample SPA stores the entire user payload locally instead of issuing tokens. Add JWT handling if you need stronger auth.

## Users

| Method | Endpoint              | Body / Query                          | Description |
|--------|-----------------------|---------------------------------------|-------------|
| POST   | `/signup`             | `{ "name", "email", "password" }`     | Create a user (dev = file storage, prod = MySQL). |
| POST   | `/login`              | `{ "email", "password" }`             | Authenticate; returns the user profile. |
| GET    | `/users`              | –                                     | List users (admin helper). |
| GET    | `/users/{id}`         | –                                     | Fetch full profile (name, age, gender, address, bio, avatar). |
| PUT    | `/users/{id}`         | `{ "name?", "age?", "gender?", "address?", "bio?" }` | Update profile fields. |
| POST   | `/users/{id}/avatar`  | multipart `file=@avatar.png`          | Upload avatar. Stored in `/media/` (dev) or S3 (prod). |

## Groups

| Method | Endpoint                    | Body / Query                                               | Description |
|--------|-----------------------------|------------------------------------------------------------|-------------|
| GET    | `/users/{id}/groups`        | –                                                          | List groups a user belongs to. |
| POST   | `/groups`                   | `{ "owner_id", "name", "description?" }`                   | Create group; owner automatically added as member. |
| GET    | `/groups/{group_id}`        | –                                                          | Full group detail: metadata, members, expenses, balances. |
| POST   | `/groups/{group_id}/members`| `{ "requester_id", "user_email" }`                         | Owner-only endpoint to invite users by email. |

## Expenses

| Method | Endpoint                                         | Body / Query                                                               | Description |
|--------|--------------------------------------------------|----------------------------------------------------------------------------|-------------|
| POST   | `/groups/{group_id}/expenses`                    | `{ "payer_email", "amount", "note?", "status?" }`                          | Add expense to group. Splits balance equally; status defaults to `assigned`. |
| PUT    | `/groups/{group_id}/expenses/{expense_id}`       | `{ "payer_email?", "amount?", "note?", "status?" }`                        | Modify an expense. Ensures payer is a member. |
| DELETE | `/groups/{group_id}/expenses/{expense_id}`       | –                                                                          | Remove expense; re-calculates balances. |

### Balance calculation

- Each expense is divided equally among group members.
- `GroupDetail.balances` returns `{ paid, owed, balance }` per member where `balance = owed - paid`. Positive = still owes, negative = is owed money.

## Health check

`GET /health` returns `{ "status": "ok" }` and is used by the ALB target groups.

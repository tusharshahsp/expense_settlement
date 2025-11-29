# Frontend (Vite + React + TypeScript)

## Prerequisites

- Node.js 18+
- npm (ships with Node)

## Setup & local development

```bash
cd frontend
npm install
npm run dev
```

- Vite serves the SPA on http://localhost:5173 by default.
- The app expects the backend at `http://localhost:8000`. Override via `VITE_API_BASE_URL`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:9000 npm run dev
```

## Production build

```bash
npm run build
npm run preview   # optional sanity-check of the static bundle
```

## Tests

Vitest powers the unit/functional tests shipped under `src/pages/__tests__`:

```bash
npm test -- --run
```

Warnings about React Router “future flags” are safe to ignore; they stem from React Router 6 preparing for v7 semantics.

# Agent help: frontend vs backend builds

This repository ships **two separate build pipelines** that are combined at deploy time. The admin UI is not compiled by Python; it is a Vite (Bun) SPA whose **production artifacts** are copied into `app/static/` and served by FastAPI.

## What runs where

| Layer | Tech | Role |
|--------|------|------|
| **API / proxy** | Python 3.13, FastAPI (`app/`) | REST, proxy, OAuth, DB, metrics |
| **Web UI** | Bun + Vite + React (`frontend/`) | Admin SPA (CSR) |

They are **not** a single unified build (e.g. no single `npm run build` for the whole repo). You build the UI, then run or package the Python app that serves `app/static/`.

## Development (two processes)

- **Backend**: run the FastAPI app (default API port in this project is commonly `2455`; OAuth callback uses `1455` per env examples).
- **Frontend**: from `frontend/`, `bun run dev` starts Vite (default **5173**). Vite **proxies** `/api`, `/v1`, `/backend-api`, and `/health` to the backend (`API_PROXY_TARGET`, default `http://localhost:2455` in `frontend/vite.config.ts`).

So locally you typically have **two terminals**: API server + Vite dev server. The browser talks to Vite; API calls are forwarded to FastAPI.

## Production build (output wiring)

- From `frontend/`: `bun run build` (see `frontend/README.md`).
- Vite `build.outDir` is **`../app/static`** (`frontend/vite.config.ts`). That populates `app/static/` with `index.html`, hashed assets under `assets/`, etc.
- FastAPI serves those files from `app/static` and uses SPA fallback for client routes (`app/main.py`). If `index.html` is missing, the app responds with a hint to run the frontend build.

## Docker

`Dockerfile` uses **multi-stage** builds:

1. **`frontend-build`**: Bun install + `bun run build` → produces `/app/app/static` in that stage.
2. **`python-build`**: `uv sync` into a venv.
3. **Runtime image**: copies `app/`, `config/`, `scripts/` and **`COPY --from=frontend-build ... app/static`** so one container runs Python with the prebuilt UI embedded.

## Quick commands

```bash
cd frontend && bun install && bun run dev   # dev UI + proxy to API
cd frontend && bun run build                # emit production assets → ../app/static
```

## Related docs

- `frontend/README.md` — frontend stack, ports, proxy list, build target.
- `AGENTS.md` — agent workflow, OpenSpec, environment notes.

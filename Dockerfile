# ---------- stage 1: build the frontend ----------
FROM node:25-alpine AS web

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# ---------- stage 2: runtime ----------
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SPECDASH_STATIC=/app/static

# git is used for read-only history (`git log`) of feature folders
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=web /build/dist ./static

# Mounted repositories are owned by the host user; a non-root uid is enough to
# read them and cannot write to a :ro mount even if it tried.
RUN useradd --create-home --uid 1000 specdash \
    && git config --system --add safe.directory '*'
USER specdash

EXPOSE 8420

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8420/api/health', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8420", "--no-access-log"]

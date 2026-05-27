FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
    libffi-dev libcairo2 libcairo-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir gunicorn uvicorn[standard] && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY frontend/dist/ backend/frontend_dist/
COPY web_run.py .

ENV DATABASE_URL=sqlite:///./backend/data/ticket_system.db
ENV SECRET_KEY=change-me-in-production
ENV HOST=0.0.0.0
ENV PORT=8000

RUN mkdir -p backend/data

VOLUME ["/app/backend/data"]
EXPOSE 8000

CMD gunicorn web_run:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --workers 4 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --timeout 120 \
    --log-level info

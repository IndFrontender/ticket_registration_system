web: gunicorn web_run:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --workers 4 --max-requests 1000 --timeout 120 --log-level info

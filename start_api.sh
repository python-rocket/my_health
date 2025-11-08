source .venv/bin/activate
export PYTHONPATH=.:$PYTHONPATH
uvicorn api:app --reload --host 0.0.0.0 --port 3002
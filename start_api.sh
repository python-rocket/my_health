source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=.:$PYTHONPATH
uvicorn api:app --reload --host 0.0.0.0 --port 3002
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi
source .venv/bin/activate
pip3 install -r requirements.txt
.venv/bin/uvicorn api:app --reload --port 8000
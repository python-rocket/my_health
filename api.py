from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import sys
import os
from pathlib import Path

# Add current directory to path for imports
current_dir = os.path.dirname(__file__)
sys.path.insert(0, current_dir)
from modules.ai_doctor.ask.ask import Ask
from modules.ai_doctor.ask.schema_extractor import extract_schema

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Extract schema on startup
schema_path = Path(__file__).parent / "ask" / "cache" / "db_schema.txt"
try:
    connection_string = os.getenv("PSQL_CONNECTION_STRING")
    if connection_string:
        extract_schema(connection_string, str(schema_path))
        print("Database schema extracted successfully")
    else:
        print("Warning: PSQL_CONNECTION_STRING not set, skipping schema extraction")
except Exception as e:
    print(f"Warning: Failed to extract schema on startup: {e}")

# Initialize Ask instance
ask_instance = Ask()

class PreferencesRequest(BaseModel):
    favoriteChannels: Optional[List[str]] = None
    favoriteSolutions: Optional[List[str]] = None
    pubmedPreferences: Optional[Dict] = None

class AskRequest(BaseModel):
    prompt: str
    preferences: Optional[PreferencesRequest] = None
    max_iterations: Optional[int] = None


@app.post("/ask")
async def ask_endpoint(request: AskRequest):
    try:
        response = ask_instance.ask_directly(
            request.prompt, 
            preferences=request.preferences.model_dump(),
            max_iterations=request.max_iterations
        )
        return {"response": response}
    except Exception as e:
        return {"error": str(e)}, 500


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)


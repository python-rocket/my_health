# My Health Frontend

This is the frontend application for the My Health project, featuring a web interface with tabs for Cockpit, Preferences, and Ask functionality.

## Prerequisites

- **Node.js** (v18 or higher) and **npm**
- **Python** (v3.8 or higher) with **pip**
- **PostgreSQL** database (configured and running)
- **Environment variables** configured (see Setup section)

## Setup

### 1. Environment Variables

Create a `.env` file in the `modules/frontend` directory with your PostgreSQL connection string:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd modules/frontend
npm install
```

### 3. FastAPI Backend Setup (for Ask functionality)

Navigate to the youtube_summarizer directory and set up Python environment:

```bash
# Create virtual environment (if not already created)
python3 -m venv venv


```

## Starting the Application

### Start Frontend Server

The frontend server runs on **port 3001** and serves both the API endpoints and static files.

```bash
cd modules/frontend

# Build TypeScript
npm run build

# Compile main.ts
tsc main.ts

# Start the server
npm start
```

The frontend will be available at: **http://localhost:3001**

### Start FastAPI Backend (Optional - for Ask tab)

The FastAPI backend runs on **port 3002** and provides the `/ask` endpoint.

```bash
cd modules/youtube_summarizer

# Activate virtual environment (if not already activated)
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate  # On Windows

# Start the FastAPI server
python3 api.py
```

The API will be available at: **http://localhost:3002**

## Development Commands

### Frontend Development

```bash
cd modules/frontend

# Development mode with auto-reload (server only)
npm run dev

# Build server TypeScript
npm run build

# Compile frontend TypeScript
tsc main.ts
```

## Application Structure

- **Frontend**: `modules/frontend/`
  - `index.html` - Main HTML file
  - `main.ts` - Frontend TypeScript logic
  - `server.ts` - Express backend server
  - `dist/` - Compiled JavaScript files
  - `preferences.json` - User preferences (auto-generated)

- **FastAPI Backend**: `modules/youtube_summarizer/`
  - `api.py` - FastAPI server for Ask functionality
  - `ask.py` - Ask class implementation

## Features

- **Cockpit Tab**: Displays favorite YouTube channels and solutions
- **Preferences Tab**: Manage favorite channels and solutions
- **Ask Tab**: Ask questions with automatic filtering by favorite channels

## Notes

- Preferences are stored in `modules/frontend/dist/preferences.json`
- The Ask functionality automatically appends favorite channels to each prompt
- Make sure PostgreSQL is running and accessible before starting the frontend
- The FastAPI backend requires OpenAI API key to be configured (via environment variables)


# OpenAI Agents SDK - File Agent Setup

This directory contains a setup for using the OpenAI Agents SDK with file reading and writing capabilities.

## Setup

1. **Create a virtual environment** (recommended):
```bash
cd agent/sdk
python3 -m venv .venv
source .venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate  # On Windows
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Set up environment variables**:
Create a `.env` file in this directory or set the `OPENAI_API_KEY` environment variable:
```bash
export OPENAI_API_KEY=your_api_key_here
```

## Usage

### Basic Usage

```python
from file_agent import run_agent_sync

# Run agent synchronously
result = run_agent_sync("Read the file README.md")
print(result)
```

### Async Usage

```python
import asyncio
from file_agent import run_agent_async

async def main():
    result = await run_agent_async("Read the file README.md and save its content to output.txt")
    print(result)

asyncio.run(main())
```

### Command Line Usage

```bash
python file_agent.py "Read the file README.md"
python file_agent.py "Read agent/tasks/11_november/1_backlog/testing_results_uploader.txt and save its content to output.txt"
python file_agent.py "List all files in the agent directory"
```

### Example Script

Run the example script:
```bash
python example.py
```

## Available Tools

The agent has access to three tools:

1. **`read_file(file_path: str)`** - Read the contents of a file
2. **`write_file(file_path: str, content: str, mode: str = "w")`** - Write content to a file
   - `mode="w"` for overwrite (default)
   - `mode="a"` for append
3. **`list_files(directory_path: str = ".", pattern: Optional[str] = None)`** - List files in a directory

## Example Instructions

You can give the agent natural language instructions like:

- "Read the file README.md"
- "Read agent/tasks/11_november/1_backlog/testing_results_uploader.txt and save its content to output.txt"
- "List all .txt files in the agent directory"
- "Read file1.txt and file2.txt, combine their contents, and save to combined.txt"
- "Read README.md, extract the main points, and save them to summary.txt"

## Notes

- File paths can be relative (resolved from current working directory) or absolute
- When writing to a new file, parent directories will be created automatically
- The agent uses UTF-8 encoding for reading and writing files


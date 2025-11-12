#!/bin/bash

# Setup script for OpenAI Agents SDK

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Setting up OpenAI Agents SDK..."

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "Setup complete!"
echo ""
echo "To use the agent:"
echo "  1. Activate the virtual environment: source .venv/bin/activate"
echo "  2. Set OPENAI_API_KEY: export OPENAI_API_KEY=your_key_here"
echo "  3. Run: python file_agent.py '<your instruction>'"
echo ""
echo "Or use the example:"
echo "  python example.py"


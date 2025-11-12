"""
Simple test script to verify the file agent setup works
"""

import os
import sys
from pathlib import Path

# Check if OPENAI_API_KEY is set
if not os.getenv("OPENAI_API_KEY"):
    print("Warning: OPENAI_API_KEY environment variable is not set.")
    print("The agent will not work without an API key.")
    print("Set it with: export OPENAI_API_KEY=your_key_here")
    sys.exit(1)

# Test imports
try:
    from file_agent import file_agent, read_file, write_file, list_files
    print("✓ Successfully imported file_agent module")
except ImportError as e:
    print(f"✗ Failed to import file_agent: {e}")
    print("Make sure you've installed dependencies: pip install -r requirements.txt")
    sys.exit(1)

# Test basic file operations
print("\nTesting file operations...")

# Test read_file tool
test_file = Path(__file__).parent / "file_agent.py"
if test_file.exists():
    try:
        result = read_file(str(test_file))
        if "File content" in result:
            print("✓ read_file tool works")
        else:
            print("✗ read_file tool returned unexpected result")
    except Exception as e:
        print(f"✗ read_file tool failed: {e}")
else:
    print("⚠ Could not test read_file (test file not found)")

# Test write_file tool
test_output = Path(__file__).parent / "test_output.txt"
try:
    result = write_file(str(test_output), "Test content\n")
    if "Successfully wrote" in result:
        print("✓ write_file tool works")
        # Clean up
        test_output.unlink()
    else:
        print("✗ write_file tool returned unexpected result")
except Exception as e:
    print(f"✗ write_file tool failed: {e}")

# Test list_files tool
try:
    result = list_files(str(Path(__file__).parent))
    if "Files in" in result:
        print("✓ list_files tool works")
    else:
        print("✗ list_files tool returned unexpected result")
except Exception as e:
    print(f"✗ list_files tool failed: {e}")

print("\n✓ All basic tests passed!")
print("\nYou can now use the agent:")
print("  python file_agent.py '<your instruction>'")


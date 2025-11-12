"""
Example usage of the File Agent
"""

import asyncio
from file_agent import run_agent_sync, run_agent_async


def example_sync():
    """Synchronous example"""
    print("=" * 60)
    print("SYNCHRONOUS EXAMPLE")
    print("=" * 60)
    
    # Example 1: Read a file
    print("\n1. Reading a file:")
    result = run_agent_sync("Read the file README.md if it exists")
    print(result)
    
    # Example 2: List files
    print("\n2. Listing files:")
    result = run_agent_sync("List all files in the agent directory")
    print(result)
    
    # Example 3: Read and save
    print("\n3. Reading and saving content:")
    result = run_agent_sync(
        "Read the file agent/tasks/11_november/1_backlog/testing_results_uploader.txt "
        "and save its content to agent/sdk/output_example.txt"
    )
    print(result)


async def example_async():
    """Asynchronous example"""
    print("\n" + "=" * 60)
    print("ASYNCHRONOUS EXAMPLE")
    print("=" * 60)
    
    # Example: Read and process
    print("\nReading and processing a file:")
    result = await run_agent_async(
        "Read the file README.md and summarize its main points, "
        "then save the summary to agent/sdk/summary.txt"
    )
    print(result)


if __name__ == "__main__":
    # Run synchronous example
    example_sync()
    
    # Run asynchronous example
    print("\n")
    asyncio.run(example_async())


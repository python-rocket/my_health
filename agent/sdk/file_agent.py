"""
File Agent Setup - OpenAI Agents SDK
This agent can read from files and save content to other files.
Extended to support PDFs, images, and CSVs for testing results extraction.
"""

import os
import base64
import json
from pathlib import Path
from typing import Optional, Dict, Any
from agents import Agent, Runner, function_tool, trace
from dotenv import load_dotenv
load_dotenv()

# Import OpenAI for vision API
try:
    from openai import OpenAI
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except ImportError:
    openai_client = None

# Import PDF libraries
PDF_AVAILABLE = False
PDF_LIBRARY = None
try:
    import PyPDF2
    PDF_AVAILABLE = True
    PDF_LIBRARY = 'pypdf2'
except ImportError:
    try:
        import pdfplumber
        PDF_AVAILABLE = True
        PDF_LIBRARY = 'pdfplumber'
    except ImportError:
        pass

# Import CSV/pandas
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

# Import PyMuPDF for PDF-to-image conversion
PDF_TO_IMAGE_AVAILABLE = False
try:
    import fitz  # PyMuPDF
    PDF_TO_IMAGE_AVAILABLE = True
except ImportError:
    pass

@function_tool
def read_file(file_path: str) -> str:
    """
    Read the contents of a file.
    
    Args:
        file_path: Path to the file to read (can be relative or absolute)
    
    Returns:
        The contents of the file as a string
    
    Raises:
        FileNotFoundError: If the file doesn't exist
        PermissionError: If the file cannot be read
    """
    print(f"\n🔧 [TOOL CALL] read_file(file_path='{file_path}')")
    print(f"   📍 Stage: Reading text file")
    try:
        path = Path(file_path)
        if not path.is_absolute():
            # If relative, resolve from current working directory
            path = Path.cwd() / path
        
        if not path.exists():
            print(f"   ❌ Error: File not found")
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not path.is_file():
            print(f"   ❌ Error: Path is not a file")
            raise ValueError(f"Path is not a file: {file_path}")
        
        print(f"   📂 Reading file: {path}")
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"   ✅ Successfully read {len(content)} characters")
        return f"File content from {file_path}:\n\n{content}"
    except Exception as e:
        print(f"   ❌ Error reading file: {str(e)}")
        return f"Error reading file {file_path}: {str(e)}"


@function_tool
def write_file(file_path: str, content: str, mode: str = "w") -> str:
    """
    Write content to a file.
    
    Args:
        file_path: Path to the file to write (can be relative or absolute)
        content: The content to write to the file
        mode: Write mode - 'w' for overwrite, 'a' for append (default: 'w')
    
    Returns:
        Success message with file path
    
    Raises:
        PermissionError: If the file cannot be written
    """
    print(f"\n🔧 [TOOL CALL] write_file(file_path='{file_path}', mode='{mode}')")
    print(f"   📍 Stage: Writing to file")
    print(f"   📝 Content length: {len(content)} characters")
    try:
        path = Path(file_path)
        if not path.is_absolute():
            # If relative, resolve from current working directory
            path = Path.cwd() / path
        
        # Create parent directories if they don't exist
        path.parent.mkdir(parents=True, exist_ok=True)
        
        write_mode = 'a' if mode == 'a' else 'w'
        print(f"   📂 Writing to: {path} (mode: {write_mode})")
        with open(path, write_mode, encoding='utf-8') as f:
            f.write(content)
        
        print(f"   ✅ Successfully wrote {len(content)} characters to file")
        return f"Successfully wrote content to {file_path} (mode: {write_mode})"
    except Exception as e:
        print(f"   ❌ Error writing file: {str(e)}")
        return f"Error writing file {file_path}: {str(e)}"


@function_tool
def list_files(directory_path: str = ".", pattern: Optional[str] = None) -> str:
    """
    List files in a directory.
    
    Args:
        directory_path: Path to the directory (default: current directory)
        pattern: Optional glob pattern to filter files (e.g., "*.txt")
    
    Returns:
        List of files in the directory
    """
    print(f"\n🔧 [TOOL CALL] list_files(directory_path='{directory_path}', pattern='{pattern}')")
    print(f"   📍 Stage: Listing files")
    try:
        path = Path(directory_path)
        if not path.is_absolute():
            path = Path.cwd() / path
        
        if not path.exists():
            print(f"   ❌ Error: Directory not found")
            return f"Directory not found: {directory_path}"
        
        if not path.is_dir():
            print(f"   ❌ Error: Path is not a directory")
            return f"Path is not a directory: {directory_path}"
        
        print(f"   📂 Listing files in: {path}")
        if pattern:
            files = list(path.glob(pattern))
            print(f"   🔍 Filter pattern: {pattern}")
        else:
            files = list(path.iterdir())
        
        file_list = [str(f.relative_to(Path.cwd())) for f in files if f.is_file()]
        dir_list = [str(f.relative_to(Path.cwd())) + "/" for f in files if f.is_dir()]
        
        print(f"   ✅ Found {len(file_list)} files and {len(dir_list)} directories")
        
        result = f"Files in {directory_path}:\n"
        if dir_list:
            result += "\nDirectories:\n" + "\n".join(f"  {d}" for d in dir_list)
        if file_list:
            result += "\nFiles:\n" + "\n".join(f"  {f}" for f in file_list)
        
        return result
    except Exception as e:
        print(f"   ❌ Error listing directory: {str(e)}")
        return f"Error listing directory {directory_path}: {str(e)}"


@function_tool
def read_pdf(file_path: str) -> str:
    """
    Read the contents of a PDF file.
    
    Args:
        file_path: Path to the PDF file to read (can be relative or absolute)
    
    Returns:
        The text content extracted from the PDF
    """
    print(f"\n🔧 [TOOL CALL] read_pdf(file_path='{file_path}')")
    print(f"   📍 Stage: Reading PDF file")
    if not PDF_AVAILABLE:
        print(f"   ❌ Error: PDF libraries not available")
        return "Error: PDF libraries not available. Please install PyPDF2 or pdfplumber."
    
    try:
        path = Path(file_path)
        if not path.is_absolute():
            path = Path.cwd() / path
        
        if not path.exists():
            print(f"   ❌ Error: File not found")
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not path.is_file():
            print(f"   ❌ Error: Path is not a file")
            raise ValueError(f"Path is not a file: {file_path}")
        
        print(f"   📂 Reading PDF: {path}")
        print(f"   📚 Using library: {PDF_LIBRARY}")
        text_content = []
        
        if PDF_LIBRARY == 'pdfplumber':
            import pdfplumber
            with pdfplumber.open(str(path)) as pdf:
                total_pages = len(pdf.pages)
                print(f"   📄 Processing {total_pages} pages...")
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                        print(f"   📄 Page {page_num}/{total_pages}: Extracted {len(text)} characters")
        elif PDF_LIBRARY == 'pypdf2':
            # Use PyPDF2
            with open(path, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                total_pages = len(pdf_reader.pages)
                print(f"   📄 Processing {total_pages} pages...")
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                        print(f"   📄 Page {page_num}/{total_pages}: Extracted {len(text)} characters")
        else:
            print(f"   ❌ Error: No PDF library available")
            return "Error: No PDF library available. Please install PyPDF2 or pdfplumber."
        
        content = "\n\n".join(text_content)
        print(f"   ✅ Successfully extracted {len(content)} characters from {len(text_content)} pages")
        return f"PDF content from {file_path}:\n\n{content}"
    except Exception as e:
        print(f"   ❌ Error reading PDF: {str(e)}")
        return f"Error reading PDF {file_path}: {str(e)}"


@function_tool
def read_image(file_path: str) -> str:
    """
    Read text content from an image file using OpenAI Vision API.
    Supports common image formats: PNG, JPEG, JPG, GIF, WEBP
    
    Args:
        file_path: Path to the image file to read (can be relative or absolute)
    
    Returns:
        The text content extracted from the image
    """
    print(f"\n🔧 [TOOL CALL] read_image(file_path='{file_path}')")
    print(f"   📍 Stage: Reading image file with Vision API")
    if not openai_client:
        print(f"   ❌ Error: OpenAI client not available")
        return "Error: OpenAI client not available. Please set OPENAI_API_KEY environment variable."
    
    try:
        path = Path(file_path)
        if not path.is_absolute():
            path = Path.cwd() / path
        
        if not path.exists():
            print(f"   ❌ Error: File not found")
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not path.is_file():
            print(f"   ❌ Error: Path is not a file")
            raise ValueError(f"Path is not a file: {file_path}")
        
        # Read image and encode to base64
        print(f"   📂 Reading image: {path}")
        with open(path, 'rb') as image_file:
            image_data = image_file.read()
            image_size = len(image_data)
            print(f"   📷 Image size: {image_size / 1024:.2f} KB")
            base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Determine MIME type from extension
        ext = path.suffix.lower()
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        mime_type = mime_types.get(ext, 'image/png')
        print(f"   🖼️  Image type: {mime_type}")
        
        # Use OpenAI Vision API
        print(f"   🤖 Calling OpenAI Vision API (gpt-4o)...")
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text and structured data from this image. If this is a medical testing results document, identify all test results with their values, units, and reference ranges. Return the content in a clear, structured format."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=4000
        )
        
        content = response.choices[0].message.content
        print(f"   ✅ Successfully extracted {len(content)} characters from image")
        return f"Image content from {file_path}:\n\n{content}"
    except Exception as e:
        print(f"   ❌ Error reading image: {str(e)}")
        return f"Error reading image {file_path}: {str(e)}"


@function_tool
def read_pdf_with_vision(file_path: str) -> str:
    """
    Read PDF file by converting pages to images and using OpenAI Vision API.
    This is better for scanned/image-based PDFs that don't have extractable text.
    
    Args:
        file_path: Path to the PDF file to read (can be relative or absolute)
    
    Returns:
        The text content extracted from the PDF using Vision API
    """
    print(f"\n🔧 [TOOL CALL] read_pdf_with_vision(file_path='{file_path}')")
    print(f"   📍 Stage: Reading PDF with Vision API (converting pages to images)")
    
    if not openai_client:
        print(f"   ❌ Error: OpenAI client not available")
        return "Error: OpenAI client not available. Please set OPENAI_API_KEY environment variable."
    
    if not PDF_TO_IMAGE_AVAILABLE:
        print(f"   ❌ Error: PyMuPDF not available for PDF-to-image conversion")
        return "Error: PyMuPDF (fitz) not available. Please install PyMuPDF: pip install PyMuPDF"
    
    try:
        path = Path(file_path)
        if not path.is_absolute():
            path = Path.cwd() / path
        
        if not path.exists():
            print(f"   ❌ Error: File not found")
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not path.is_file():
            print(f"   ❌ Error: Path is not a file")
            raise ValueError(f"Path is not a file: {file_path}")
        
        print(f"   📂 Reading PDF: {path}")
        
        # Open PDF and convert pages to images
        import fitz
        doc = fitz.open(str(path))
        total_pages = len(doc)
        print(f"   📄 PDF has {total_pages} page(s)")
        
        all_content = []
        
        for page_num in range(total_pages):
            print(f"   📄 Processing page {page_num + 1}/{total_pages}...")
            page = doc[page_num]
            
            # Convert page to image (PNG)
            # Use zoom factor of 2.0 for better quality
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Encode to base64
            base64_image = base64.b64encode(img_data).decode('utf-8')
            image_size = len(img_data)
            print(f"   📷 Page {page_num + 1} image size: {image_size / 1024:.2f} KB")
            
            # Use OpenAI Vision API
            print(f"   🤖 Calling OpenAI Vision API for page {page_num + 1}...")
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Extract all text and structured data from this image (page {page_num + 1} of {total_pages}). If this is a medical testing results document, identify all test results with their values, units, and reference ranges. Return the content in a clear, structured format."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=4000
            )
            
            page_content = response.choices[0].message.content
            all_content.append(f"--- Page {page_num + 1} ---\n{page_content}")
            print(f"   ✅ Page {page_num + 1}: Extracted {len(page_content)} characters")
        
        doc.close()
        
        combined_content = "\n\n".join(all_content)
        print(f"   ✅ Successfully extracted {len(combined_content)} characters from {total_pages} page(s)")
        return f"PDF content from {file_path} (extracted with Vision API):\n\n{combined_content}"
        
    except Exception as e:
        print(f"   ❌ Error reading PDF with Vision API: {str(e)}")
        import traceback
        print(f"   Traceback:\n{traceback.format_exc()}")
        return f"Error reading PDF {file_path} with Vision API: {str(e)}"


@function_tool
def read_csv(file_path: str) -> str:
    """
    Read the contents of a CSV file.
    
    Args:
        file_path: Path to the CSV file to read (can be relative or absolute)
    
    Returns:
        The content of the CSV file as formatted text
    """
    print(f"\n🔧 [TOOL CALL] read_csv(file_path='{file_path}')")
    print(f"   📍 Stage: Reading CSV file")
    if not PANDAS_AVAILABLE:
        print(f"   ⚠️  Pandas not available, falling back to read_file")
        # Fallback to regular file reading
        return read_file(file_path)
    
    try:
        path = Path(file_path)
        if not path.is_absolute():
            path = Path.cwd() / path
        
        if not path.exists():
            print(f"   ❌ Error: File not found")
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not path.is_file():
            print(f"   ❌ Error: Path is not a file")
            raise ValueError(f"Path is not a file: {file_path}")
        
        # Read CSV with pandas
        print(f"   📂 Reading CSV: {path}")
        df = pd.read_csv(path)
        print(f"   📊 CSV dimensions: {len(df)} rows × {len(df.columns)} columns")
        print(f"   📋 Columns: {', '.join(df.columns.tolist())}")
        
        # Convert to string representation
        content = df.to_string(index=False)
        print(f"   ✅ Successfully read CSV with {len(df)} rows")
        return f"CSV content from {file_path}:\n\n{content}\n\nColumns: {', '.join(df.columns.tolist())}"
    except Exception as e:
        print(f"   ❌ Error reading CSV: {str(e)}")
        return f"Error reading CSV {file_path}: {str(e)}"


# Create the agent with file operations
file_agent = Agent(
    name="File Agent",
    instructions="""You are a helpful file management agent. You can:
- Read text files from the filesystem
- Read PDF files and extract text
- Read images and extract text using vision capabilities
- Read CSV files
- Write content to files
- List files in directories

When a user asks you to:
- Read a text file: Use the read_file tool
- Read a PDF file: Use the read_pdf_with_vision tool (converts PDF pages to images and uses Vision API for better OCR)
- Read an image file: Use the read_image tool
- Read a CSV file: Use the read_csv tool
- Save content: Use the write_file tool
- List files: Use the list_files tool

Always be careful with file paths and confirm what you're doing. If a file path is relative, 
it will be resolved from the current working directory. If writing to a new file, make sure 
the parent directory exists or it will be created automatically.

For testing results extraction, use the appropriate tool based on file type:
- PDF files: use read_pdf_with_vision (converts PDF pages to images and uses Vision API for better OCR, especially for scanned documents)
- Image files (PNG, JPG, etc.): use read_image
- CSV files: use read_csv
- Text files: use read_file""",
    tools=[read_file, write_file, list_files, read_pdf, read_pdf_with_vision, read_image, read_csv],
)


def run_agent_sync(input_text: str) -> str:
    """
    Run the agent synchronously with the given input.
    Uses native tracing system which automatically logs to OpenAI's trace dashboard.
    
    Args:
        input_text: The instruction or question for the agent
    
    Returns:
        The final output from the agent
    """
    print("\n" + "=" * 80)
    print("🔍 AGENT RUN STARTED")
    print("=" * 80)
    with trace("File Agent Workflow") as current_trace:
        print(f"📊 Trace ID: {current_trace.trace_id}")
        result = Runner.run_sync(file_agent, input_text)
    print("=" * 80)
    print("✅ AGENT RUN COMPLETED")
    print("=" * 80 + "\n")
    return result.final_output


async def run_agent_async(input_text: str) -> str:
    """
    Run the agent asynchronously with the given input.
    Uses native tracing system which automatically logs to OpenAI's trace dashboard.
    
    Args:
        input_text: The instruction or question for the agent
    
    Returns:
        The final output from the agent
    """
    print("\n" + "=" * 80)
    print("🔍 AGENT RUN STARTED")
    print("=" * 80)
    with trace("File Agent Workflow") as current_trace:
        print(f"📊 Trace ID: {current_trace.trace_id}")
        result = await Runner.run(file_agent, input_text)
    print("=" * 80)
    print("✅ AGENT RUN COMPLETED")
    print("=" * 80 + "\n")
    return result.final_output


async def run_agent_async_with_trace(input_text: str) -> Dict[str, Any]:
    """
    Run the agent asynchronously and return result with trace information.
    Uses native tracing system for logging and extracts trace info for API response.
    
    Args:
        input_text: The instruction or question for the agent
    
    Returns:
        Dictionary containing final_output and trace information
    """
    trace_info = {
        "final_output": "",
        "tool_calls": [],
        "tool_usage_summary": {},
        "messages_count": 0
    }
    
    print("\n" + "=" * 80)
    print("🔍 AGENT RUN WITH TRACE STARTED")
    print("=" * 80)
    
    try:
        with trace("File Agent Workflow") as current_trace:
            print(f"📊 Trace ID: {current_trace.trace_id}")
            print(f"📝 Input: {input_text[:200]}..." if len(input_text) > 200 else f"📝 Input: {input_text}")
            print()
            
            result = await Runner.run(file_agent, input_text)
            trace_info["final_output"] = result.final_output
            
            # Extract trace information from conversation history and log in real-time
            if hasattr(result, 'to_input_list'):
                try:
                    input_list = result.to_input_list()
                    trace_info["messages_count"] = len(input_list)
                    
                    print(f"📨 Processing {len(input_list)} messages from conversation...")
                    print()
                    
                    # Extract tool calls from conversation history and log them
                    for idx, item in enumerate(input_list, 1):
                        if isinstance(item, dict):
                            role = item.get('role', 'unknown')
                            
                            # Log tool calls as they appear
                            if role == 'assistant':
                                tool_calls = item.get('tool_calls', [])
                                if tool_calls:
                                    for tool_call in tool_calls:
                                        tool_call_info = {
                                            "tool_name": None,
                                            "arguments": None,
                                            "result": None
                                        }
                                        
                                        if isinstance(tool_call, dict) and 'function' in tool_call:
                                            func = tool_call['function']
                                            tool_name = func.get('name', 'unknown')
                                            tool_call_info["tool_name"] = tool_name
                                            
                                            args = func.get('arguments', '')
                                            if isinstance(args, str):
                                                try:
                                                    parsed_args = json.loads(args)
                                                    tool_call_info["arguments"] = parsed_args
                                                except:
                                                    tool_call_info["arguments"] = args
                                            else:
                                                tool_call_info["arguments"] = args
                                            
                                            tool_call_info["id"] = tool_call.get('id')
                                            trace_info["tool_calls"].append(tool_call_info)
                                            
                                            # Log tool call in real-time
                                            print(f"🔧 [{idx}] Tool Call: {tool_name}")
                                            if tool_call_info["arguments"]:
                                                args_str = json.dumps(tool_call_info["arguments"], indent=2)
                                                if len(args_str) > 300:
                                                    args_str = args_str[:300] + "... (truncated)"
                                                print(f"   Arguments: {args_str}")
                                            
                            # Log tool results as they appear
                            elif role == 'tool':
                                tool_result_id = item.get('tool_call_id')
                                tool_result_content = item.get('content', '')
                                tool_name = item.get('name', 'unknown')
                                
                                # Match tool result with tool call
                                for tc in trace_info["tool_calls"]:
                                    if tc.get("id") == tool_result_id:
                                        tc["result"] = tool_result_content[:500] if tool_result_content else None
                                        
                                        # Log tool result
                                        print(f"✅ [{idx}] Tool Result: {tool_name}")
                                        if tool_result_content:
                                            result_preview = tool_result_content[:200] + "..." if len(tool_result_content) > 200 else tool_result_content
                                            print(f"   Result Preview: {result_preview}")
                                        break
                    
                    # Create tool usage summary
                    if trace_info["tool_calls"]:
                        tool_usage_summary = {}
                        for tc in trace_info["tool_calls"]:
                            tool_name = tc.get("tool_name", "unknown")
                            tool_usage_summary[tool_name] = tool_usage_summary.get(tool_name, 0) + 1
                        trace_info["tool_usage_summary"] = tool_usage_summary
                    
                    # Store trace ID for reference
                    if current_trace:
                        trace_info["trace_id"] = current_trace.trace_id
                        
                except Exception as e:
                    print(f"⚠️  Error extracting trace information: {str(e)}")
                    trace_info["trace_extraction_error"] = str(e)
            else:
                print("⚠️  Result object does not have 'to_input_list' method")
    
    except Exception as e:
        print(f"\n❌ ERROR during agent execution: {str(e)}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        print(f"   Traceback:\n{traceback.format_exc()}")
        raise  # Re-raise to let API handle it
    
    # Log final summary statistics
    print()
    print("=" * 80)
    print("📊 FINAL STATISTICS")
    print("=" * 80)
    print(f"📨 Total Messages: {trace_info.get('messages_count', 0)}")
    print(f"🔧 Total Tool Calls: {len(trace_info.get('tool_calls', []))}")
    
    if trace_info.get("tool_usage_summary"):
        print(f"\n📋 Tool Usage Summary:")
        for tool_name, count in trace_info["tool_usage_summary"].items():
            print(f"   - {tool_name}: {count} time(s)")
    
    if trace_info.get("trace_id"):
        print(f"\n📊 Trace ID: {trace_info['trace_id']}")
        print(f"   View full trace at: https://platform.openai.com/traces")
    
    print("=" * 80)
    print("✅ AGENT RUN WITH TRACE COMPLETED")
    print("=" * 80 + "\n")
    
    return trace_info


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) > 1:
        instruction = " ".join(sys.argv[1:])
        print(f"Running agent with instruction: {instruction}\n")
        output = run_agent_sync(instruction)
        print(f"\nAgent output:\n{output}")
    else:
        print("Usage: python file_agent.py '<your instruction>'")
        print("\nExamples:")
        print("  python file_agent.py 'Read the file README.md'")
        print("  python file_agent.py 'Read agent/tasks/11_november/1_backlog/testing_results_uploader.txt and save its content to output.txt'")
        print("  python file_agent.py 'List all files in the agent directory'")


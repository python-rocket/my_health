from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import logging
import asyncio
import shutil
import os
from dotenv import load_dotenv
from src.llm.openai.text_completion import OpenAITextCompletion
from src.llm.openai.file_upload import OpenAIWithFileUpload
from src.file_parser.pdf_split_pages import split_pdf_by_page
load_dotenv()

def check_env_variables():
    if not os.getenv("OPENAI_API_KEY"):
        raise ValueError("OPENAI_API_KEY is not set")
    else:
        print("OPENAI_API_KEY is set")

app = FastAPI()

UPLOAD_DIR = "data/testing_files/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Add CORS middleware to allow preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Specify the domains allowed to access your API, use ["*"] for all domains
    allow_credentials=True,
    allow_methods=["*"],  # Specify the HTTP methods allowed, use ["*"] for all methods
    allow_headers=["*"],  # Specify the request headers allowed, use ["*"] for all headers
)


logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    check_env_variables()

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"info": f"file '{file.filename}' saved at '{file_location}'"}

@app.get("/normalize")
async def normalize(file_name: str):
    with open(f"{UPLOAD_DIR}/{file_name}", "r") as file:
        file_content = file.read()
    print(file_content)
    """
    Reads test from file/storage.
    Normalizes the test results into specfic schema (json or csv)
    """
    pass

@app.get("/save")
async def save(test_result: str):
    """
    Saves the test results into database/storage.
    """
    pass



@app.get("/llm/text")
async def llm(prompt_file_name: str):
    """
    Uses LLM to parse the test results.
    """
    llm_processor = OpenAITextCompletion(client="openai")
    response = llm_processor.start(prompt_file_name=prompt_file_name)
    return response

@app.get("/llm/file")
async def llm_file(file_name_prompt: str = "src/llm/prompts/get_csv.txt", file_name: str = "gi_full"):
    """
    Uses LLM to parse the test results from a file.
    """
    # read all files in data/health_tests/split_pdf/
    files = os.listdir(f"data/health_tests/split_pdf/{file_name}/")
    for file in files[0:3]:
        print(f"Processing file: {file}")
        openai_with_file_upload = OpenAIWithFileUpload()
        # Pass only the filename (with suffix) to start()
        file_path = f"data/health_tests/split_pdf/gi_full/{file}"
        response = openai_with_file_upload.start(file_name_prompt=file_name_prompt, file_name_attach=file_path)
    return "success"

@app.get("/split_pdf")
async def split_pdf(file_name: str = "data/health_tests/gi_full.pdf"):
    """
    Splits a PDF into separate files, one per page.
    """
    base_path = "data/health_tests/split_pdf/"
    file_name_split = file_name.split("/")[-1].split(".")[0]
    output_dir = f"{base_path}/{file_name_split}"
    split_pdf_by_page(file_name, output_dir)
    return {"info": f"pdf '{file_name}' split into pages"}



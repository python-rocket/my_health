


from src.llm.openai.client import OpenAIClient
from dotenv import load_dotenv
import os
import json
from typing import Tuple

load_dotenv()

class OpenAITextCompletion:
    def __init__(self, client: str):
        self._validate_openai_key()
        self.client = OpenAIClient(api_key=os.getenv("OPENAI_API_KEY"))
        

    def _validate_openai_key(self):
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY is not set")
        else:
            print("OPENAI_API_KEY is set")
        
    def _read_prompt(self, prompt_file_name: str) -> str:
        with open(f"src/llm/prompts/{prompt_file_name}", "r") as file:
            return file.read()
        
    def _prepare_prompt():
        pass
    
    def _clean_response(self, response: str) -> dict:
        return response
        

    def start(self, prompt_file_name: str):
        prompt = self._read_prompt(prompt_file_name=prompt_file_name)
        response = self.client.generate_completion(prompt)
        response = self._clean_response(response)
        return response
    
if __name__ == "__main__":
    PROMPT_FILE_NAME = "template.txt"
    llm_processor = OpenAITextCompletion("openai")
    response = llm_processor.start(prompt_file_name=PROMPT_FILE_NAME)
    print(response)
    
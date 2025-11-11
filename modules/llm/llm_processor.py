from llm.openai.client import OpenAIClient
from dotenv import load_dotenv
import os
import json
from typing import Tuple
import pandas as pd
import hashlib
from modules.youtube_summarizer.src.utils.psql_client import PSQLClient

load_dotenv()

from pydantic import BaseModel


class LLMResult(BaseModel):
    template_path: str
    injecting: dict
    answer: str


class LLMProcessor:
    def __init__(self, client: str, use_tools: bool = False, use_response_api: bool = False):
        if client == "openai":
            API_KEY = os.getenv("OPENAI_API_KEY")
            self.openai_client = OpenAIClient(API_KEY, use_tools=use_tools, use_response_api=use_response_api)
        else:
            raise ValueError(f"Client {client} not supported")
        self.psql_client = PSQLClient(os.getenv("PSQL_CONNECTION_STRING"))

    def _validate_return_format(self, return_format: str):
        accepted_return_formats = ["json", "text"]
        if return_format not in accepted_return_formats:
            raise ValueError(
                f"Return format {return_format} not supported. Suported are {accepted_return_formats}."
            )

    def _prepare_prompt(self, text: str, injecting_text: dict) -> str:
        """
        Injecting text into the prompt for placeholders.
        """
        for key, value in injecting_text.items():
            placeholder = f"** {key} **"
            if placeholder not in text:
                print(f"WARNING: Placeholder {placeholder} not found in text. Cant inject.")
            text = text.replace(f"** {key} **", value)
        return text

    def _clean_response(self, response: str, return_format: str) -> dict:
        if return_format == "json":
            response = self._return_valid_json(response)
        elif return_format == "text":
            response = response
        return response

    def _return_valid_json(self, response: str) -> str:
        response = response.replace("```json", "").replace("```", "").replace("\n", "")
        try:
            response = json.loads(response)
            response = json.dumps(response)
        except Exception as e:
            print("WARNING: Response is not a valid JSON: ", response)
            return '{}'
        return response

    def start(
        self,
        template_path: str,
        injecting: dict,
        return_format: str,
        max_iterations: int = None
    ) -> LLMResult:
        self._validate_return_format(return_format)
        prompt = open(template_path, "r").read()
        prompt = self._prepare_prompt(prompt, injecting)
        response = self.openai_client.ask(prompt, max_iterations=max_iterations)
        response = self._clean_response(response, return_format)
        llm_result = {
            "template_path": template_path,
            "injecting": injecting,
            "answer": response,
        }
        llm_result = LLMResult(**llm_result)
        return llm_result


if __name__ == "__main__":
    template_path = "youtube_summarizer/llm/prompts/tools.txt"
    """
    injecting = {
        "question": "What is the capital city of France?",
        "input_text": "Answer me the quesiton and tell a joke.",
    }
    """
    injecting = {}
    return_format = "text"
    llm_processor = LLMProcessor("openai", use_tools=True, use_response_api=False)
    response = llm_processor.start(
        template_path=template_path, injecting=injecting, return_format=return_format
    )
    print("response: ")
    print(response)

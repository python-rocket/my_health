


from llm.openai.client import OpenAIClient
from dotenv import load_dotenv
import os
import json
from typing import Tuple
import pandas as pd
import hashlib
from src.utils.psql_client import PSQLClient

load_dotenv()

from pydantic import BaseModel

class LLMResponse(BaseModel):
    video_id: str
    question_id: str
    question: str
    answer: str

class LLMProcessor:
    def __init__(self, client: str):
        if client == "openai":
            API_KEY = os.getenv("OPENAI_API_KEY")
            self.client = OpenAIClient(API_KEY)
        else:
            raise ValueError(f"Client {client} not supported")
        self.psql_client = PSQLClient(os.getenv("PSQL_CONNECTION_STRING"))
        
    def _prepare_prompt(self,text: str, description: str, question: str):
        text = text.replace("{{ input_text }}", description)
        text = text.replace("{{ question }}", question)
        return text
    
    def _clean_response(self, response: str) -> dict:
        response = response.replace("```json", "").replace("```", "").replace("\n", "")
        response = json.loads(response)
        return response
    
    def _save_response(self, response: LLMResponse, file_name: str):

        df = pd.DataFrame([response.model_dump()])
        # if file exists, read it and get the existing ids
        if os.path.isfile(file_name):
            existing_ids = pd.read_csv(file_name)["question_id"].tolist()
        else:
            existing_ids = []
        if response.question_id in existing_ids:
            print(f"Response {response.question_id} already exists")
            return
        if not os.path.isfile(file_name):
            # create directory if it doesn't exist
            os.makedirs(os.path.dirname(file_name), exist_ok=True)
            df.to_csv(file_name, index=False)
        else:
            df.to_csv(file_name, mode='a', header=False, index=False)
            
    def _upload_to_database(self, response: LLMResponse):
        df = pd.DataFrame([response.model_dump()])
        self.psql_client.write(df, "video_insight", "public")
        

    def start(self, video_id: str, input_text: str, question: str, output_path: str):
        prompt = open("llm/prompts/template.txt", "r").read()
        prompt = self._prepare_prompt(prompt, input_text, question)
        response = self.client.generate_completion(prompt)
        question_hash = hashlib.sha256(question.encode()).hexdigest()
        llm_response = LLMResponse(video_id=video_id, question_id=question_hash, question=question, answer=response)
        print("LLM response: ", llm_response)
        
        self._save_response(llm_response, output_path)
        self._upload_to_database(llm_response)
        #response = self._clean_response(response)
        return response

        
       
if __name__ == "__main__":
    llm_processor = LLMProcessor("openai")
    response = llm_processor.start()
    print("response: ")
    print(response)
    



from src.llm.openai.client import OpenAIClient
from dotenv import load_dotenv
import os
import json
from typing import Tuple

load_dotenv()

class LLMProcessor:
    def __init__(self, client: str):
        if client == "openai":
            API_KEY = os.getenv("OPENAI_API_KEY")
            self.client = OpenAIClient(API_KEY)
        else:
            raise ValueError(f"Client {client} not supported")
        
    def _prepare_prompt_variations(self,text: str, description: str, variations: list, synonyms: dict):
        text = text.replace("{{ description }}", description)
        text = text.replace("{{ variations }}", json.dumps(variations))
        text = text.replace("{{ variation_synonyms }}", json.dumps(synonyms))
        return text
    
    def _clean_response(self, response: str) -> dict:
        response = response.replace("```json", "").replace("```", "").replace("\n", "")
        response = json.loads(response)
        return response
        

    def get_variation(
        self, description: str, top_candidates: list, variations: list, synonyms: dict) -> Tuple[dict, bool, dict]:
        response = None
        winner_candidate = None
        confident_match = False
            
        prompt = open("src/llm/prompts/variation_from_description.txt", "r").read()
        prompt = self._prepare_prompt_variations(prompt, description, variations, synonyms)
        response = self.client.generate_completion(prompt)
        response = self._clean_response(response)
        
        # add variation and synonyms
        response["variations"] = variations
        response["synonyms"] = synonyms
        response["reused_llm_response"] = False
        response["additional_info"] = None
        
        if response["confident"]:
            try:
                winner_index = response["winner"][0]
                winner_candidate = top_candidates[winner_index]
                confident_match = True
                return winner_candidate, confident_match, response
            except:
                print("Error when extracting winner candidate of llm")
                winner_candidate = None
                confident_match = False
                return winner_candidate, confident_match, response
        else:
            return winner_candidate, confident_match, response
            
    
if __name__ == "__main__":
    llm_processor = LLMProcessor("openai")
    description = "This is an amazing car with a Long nose"
    top_candidates = [{"variation": "short nose"}, {"variation": "long nose"}]
    winner_candidate, confident, response= llm_processor.get_variation(description, top_candidates)
    print("\nTEST RESULT")
    print("confident: ", confident)
    print("winner candidate: ", winner_candidate)
    
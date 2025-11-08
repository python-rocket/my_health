from openai import OpenAI
from typing import List, Optional
from llm.openai.tools import generate_completion_with_tools
import os

class OpenAIClient:
    def __init__(self, api_key: str, use_tools: bool = False, use_response_api: bool = False, max_iterations: int = None):
        """Initialize OpenAI client with API key."""
        self.client = OpenAI(api_key=api_key)
        self.model = "o4-mini-2025-04-16"
        self.use_tools = use_tools
        self.use_response_api = use_response_api
        self.max_iterations = max_iterations

    def _generate_completion(
        self,
        prompt: str,
        tools: list = [],
        temperature: float = 1,
        max_tokens: Optional[int] = 2048,
    ) -> str:
        """
        Generate a completion using OpenAI's chat completion endpoint.
        
        Args:
            prompt: The input text prompt
            model: OpenAI model to use
            temperature: Controls randomness (0.0 to 1.0)
            max_tokens: Maximum tokens in response (optional)
        
        Returns:
            Generated text response
        """
        from openai import OpenAI
        client = OpenAI()
        completion = client.chat.completions.create(
            model=self.model,
            store=True,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        return completion.choices[0].message.content
    
    def _response_api(self, prompt: str):
        

        response = self.client.responses.create(
            model="gpt-5",
            input=prompt
        )

        return response.output_text
    
    def _wrapped_generate_completion_with_tools(self, prompt: str, max_iterations: int = None):
        # Use instance max_iterations if not provided
        iterations = max_iterations if max_iterations is not None else self.max_iterations
        response = generate_completion_with_tools(prompt, max_iterations=iterations)
        return response.result if hasattr(response, 'result') else str(response)
    
    def ask(self, prompt: str, max_iterations: int = None) -> str:
        if self.use_tools:
            return self._wrapped_generate_completion_with_tools(prompt, max_iterations=max_iterations)
        elif self.use_response_api:
            return self._response_api(prompt)
        else:
            return self._generate_completion(prompt)


if __name__ == "__main__":
    prompt = "any idea which study is referenced? if yes provide me the pubmed id: Forest bathing (“shinrin-yoku”), beach swims, and wilderness exposure boost natural killer cell activity by about 50% for months, strengthening overall immunity."
    client = OpenAIClient(api_key=os.getenv("OPENAI_API_KEY"), use_tools=False, use_response_api=True)
    client.ask(prompt=prompt)
from openai import OpenAI
from typing import List, Optional

class OpenAIClient:
    def __init__(self, api_key: str):
        """Initialize OpenAI client with API key."""
        self.client = OpenAI(api_key=api_key)
        self.model = "o4-mini-2025-04-16"

    def generate_completion(
        self,
        prompt: str,
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
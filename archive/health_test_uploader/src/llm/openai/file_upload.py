import openai
import os
from dotenv import load_dotenv
import time
load_dotenv()

class OpenAIWithFileUpload:
    def __init__(self):
        self.openai = openai
        self.openai.api_key = os.getenv("OPENAI_API_KEY")
        self.base_path_prompts = "src/llm/prompts/"
        self.base_path_files = "data/health_tests/"

    def upload_file(self, path):
        resp = openai.files.create(
            file=open(path, "rb"),
            purpose="assistants"
        )
        return resp.id

    def create_assistant(self, instructions="You have access to uploaded files via file‑search tool."):
        resp = openai.beta.assistants.create(
            model="gpt-4o", #"gpt-3.5-turbo-1106",  # or your chosen model
            name="File‑search Assistant",
            instructions=instructions,
            tools=[{"type": "file_search"}]
        )
        return resp.id

    def create_thread(self):
        resp = openai.beta.threads.create()
        return resp.id

    def send_user_message(self, thread_id, content, file_ids=None):
        data = {"role": "user", "content": content}
        if file_ids:
            data["attachments"] = [{"file_id": fid, "tools": [{"type": "file_search"}]} for fid in file_ids]
        resp = openai.beta.threads.messages.create(thread_id=thread_id, **data)
        return resp

    def run_assistant(self, thread_id, assistant_id):
        run = openai.beta.threads.runs.create(thread_id=thread_id, assistant_id=assistant_id)
        # poll until completed
        while True:
            r = openai.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
            if r.status == "completed":
                break
            if r.status in ("failed", "cancelled", "expired"):
                raise RuntimeError(f"Run {r.status}")
            time.sleep(1)
        return run

    def get_assistant_reply(self, thread_id):
        msgs = openai.beta.threads.messages.list(thread_id=thread_id)
        # find last assistant message
        for m in reversed(msgs.data):
            if m.role == "assistant":
                return m.content[0].text.value
        return None


    def _save_answer(self, answer: str, file_name_attach: str):
        file_name = file_name_attach.split("/")[-1].split(".")[0]
        with open(f"data/health_tests/split_pdf/{file_name}.txt", "w") as file:
            file.write(answer)

    def start(self, prompt: str, file_name_attach: str):
        file_id = self.upload_file(file_name_attach)
        print("File uploaded, id:", file_id)
        assistant_id = self.create_assistant()
        print("Assistant created id:", assistant_id)
        thread_id = self.create_thread()
        print("Thread created id:", thread_id)
        
        self.send_user_message(thread_id, prompt, file_ids=[file_id])
        self.run_assistant(thread_id, assistant_id)
        answer = self.get_assistant_reply(thread_id)
        print("\nAssistant:", answer)
        #self._save_answer(answer, file_name_attach)
        return answer


if __name__ == "__main__":
    file_name_prompt = "src/llm/prompts/template.txt"
    file_name_attach = "data/health_tests/file_1.pdf"
    openai_with_file_upload = OpenAIWithFileUpload()
    openai_with_file_upload.start(file_name_prompt, file_name_attach)
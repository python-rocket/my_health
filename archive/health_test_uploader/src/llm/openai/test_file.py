import os
import openai
import time

openai.api_key = os.getenv("OPENAI_API_KEY")

def upload_file(path):
    resp = openai.files.create(
        file=open(path, "rb"),
        purpose="assistants"
    )
    return resp.id

def create_assistant(instructions="You have access to uploaded files via file‑search tool."):
    resp = openai.beta.assistants.create(
        model="gpt-4o", #"gpt-3.5-turbo-1106",  # or your chosen model
        name="File‑search Assistant",
        instructions=instructions,
        tools=[{"type": "file_search"}]
    )
    return resp.id

def create_thread():
    resp = openai.beta.threads.create()
    return resp.id

def send_user_message(thread_id, content, file_ids=None):
    data = {"role": "user", "content": content}
    if file_ids:
        data["attachments"] = [{"file_id": fid, "tools": [{"type": "file_search"}]} for fid in file_ids]
    resp = openai.beta.threads.messages.create(thread_id=thread_id, **data)
    return resp

def run_assistant(thread_id, assistant_id):
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

def get_assistant_reply(thread_id):
    msgs = openai.beta.threads.messages.list(thread_id=thread_id)
    # find last assistant message
    for m in reversed(msgs.data):
        if m.role == "assistant":
            return m.content[0].text.value
    return None


def _read_prompt(file_name_prompt: str) -> str:
    with open(file_name_prompt, "r") as file:
        return file.read()

def start(file_name_prompt: str, file_name_attach: str):
    file_id = upload_file(file_name_attach)
    print("File uploaded, id:", file_id)
    assistant_id = create_assistant()
    print("Assistant created id:", assistant_id)
    thread_id = create_thread()
    print("Thread created id:", thread_id)
    
    prompt = _read_prompt(file_name_prompt)
    send_user_message(thread_id, prompt, file_ids=[file_id])
    run_assistant(thread_id, assistant_id)
    answer = get_assistant_reply(thread_id)
    print("\nAssistant:", answer)


if __name__ == "__main__":
    file_name_prompt = "src/llm/prompts/template.txt"
    file_name_attach = "data/health_tests/file_1.pdf"
    start(file_name_prompt, file_name_attach)

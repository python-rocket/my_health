import os
from src.llm.openai.file_upload import OpenAIWithFileUpload

def get_pdfs(path: str):
    files = os.listdir(path)
    return files


def _save_answer(answer: str, file_name: str):
    base_path = "src/custom_scripts/data/gi_gutflora"
    with open(f"{base_path}/{file_name}.txt", "w") as file:
        file.write(answer)


def main():
    path = "data/health_tests/split_pdf/gi_full"
    pdfs = get_pdfs(path)
    print(pdfs)
    PROMPT = """
    Translate everything into english.
    Different pages can have different structure. Sometimes the reference might be available which gives a normal range for comparison.
    In the comments can be the information if the test value is to high or to low. Or any other comment in the document.
    List all the different test results in a unified csv format, which looks like this. Dont return any other text expect the pure csv text.
    category, object, result, reference, comments
    """
    
    for pdf in pdfs:
        print(f"Processing {pdf}")
        file_name_attach = f"data/health_tests/split_pdf/gi_full/{pdf}"
        openai_with_file_upload = OpenAIWithFileUpload()
        answer = openai_with_file_upload.start(PROMPT, file_name_attach)
        _save_answer(answer, pdf)

if __name__ == "__main__":
    main()
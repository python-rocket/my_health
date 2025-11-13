import os
from PyPDF2 import PdfReader, PdfWriter

def split_pdf_by_page(input_pdf_path, output_dir):
    """
    Splits a PDF into separate files, one per page.

    Args:
        input_pdf_path (str): Path to the input PDF file.
        output_dir (str): Directory to save the split PDF pages.

    Returns:
        List of output file paths.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    reader = PdfReader(input_pdf_path)
    output_files = []

    for i, page in enumerate(reader.pages):
        writer = PdfWriter()
        writer.add_page(page)
        output_path = os.path.join(output_dir, f"page_{i+1}.pdf")
        with open(output_path, "wb") as out_f:
            writer.write(out_f)
        output_files.append(output_path)
        print(f"Saved: {output_path}")

    return output_files

# Example usage:
# split_pdf_by_page("input.pdf", "output_pages")
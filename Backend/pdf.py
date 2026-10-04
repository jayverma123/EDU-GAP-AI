import pymupdf


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract readable text from a PDF using PyMuPDF.
    """

    if not file_bytes:
        raise ValueError("PDF file is empty.")

    document = pymupdf.open(
        stream=file_bytes,
        filetype="pdf"
    )

    pages = []

    try:
        for page in document:
            text = page.get_text("text")

            if text:
                pages.append(text)
    finally:
        document.close()

    extracted_text = "\n\n".join(pages).strip()

    if not extracted_text:
        raise ValueError(
            "No readable text was found in this PDF."
        )

    return extracted_text
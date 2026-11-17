"""PDF text extraction and short descriptions for the college documents page."""

from io import BytesIO
from pathlib import Path

from pypdf import PdfReader


def extract_pdf_text(pdf_data: bytes) -> str:
    """Extract selectable text from a PDF. Scanned image PDFs need OCR."""
    reader = PdfReader(BytesIO(pdf_data))
    return " ".join(page.extract_text() or "" for page in reader.pages).strip()


def create_summary(text: str, word_count: int = 16) -> str:
    """Return the first 16 whitespace-separated words followed by an ellipsis."""
    words = text.split()
    if not words:
        raise ValueError("В PDF не найден текст для создания краткого описания")
    return f"{' '.join(words[:word_count])}..."


def summarize_pdf_data(pdf_data: bytes) -> str:
    return create_summary(extract_pdf_text(pdf_data))


def parse_pdf(path: Path) -> tuple[bytes, str]:
    pdf_data = path.read_bytes()
    return pdf_data, summarize_pdf_data(pdf_data)

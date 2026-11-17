"""Idempotently import the bundled college PDFs into the documents table."""

import logging
from pathlib import Path

from sqlalchemy import select

from app.db import SessionLocal
from app.document_parser import parse_pdf
from app.models import Document

logger = logging.getLogger(__name__)
DOCUMENT_DIR = Path(__file__).parent / "document_files"
CATEGORY = "Документы и бланки"
DOCUMENTS = (
    ("01_Правила_внутреннего_распорядка.pdf", "Правила внутреннего распорядка"),
    ("02_Кодекс_чести_студента.pdf", "Кодекс чести студента"),
    (
        "03_Администрация_и_Педагогический_совет.pdf",
        "Администрация и педагогический совет",
    ),
    ("04_О_колледже_и_преимущества.pdf", "О колледже и преимущества"),
    ("05_Вакансии.pdf", "Вакансии"),
)


def ingest_documents() -> None:
    with SessionLocal() as session:
        for sort_order, (filename, title) in enumerate(DOCUMENTS, start=1):
            path = DOCUMENT_DIR / filename
            pdf_data, description = parse_pdf(path)
            document = session.scalar(
                select(Document).where(Document.title == title)
            )
            if document is None:
                document = Document(title=title, category=CATEGORY, url="")
                session.add(document)
            document.category = CATEGORY
            document.description = description
            document.file_name = filename
            document.file_data = pdf_data
            document.sort_order = sort_order
            session.flush()
            document.url = f"/api/v1/documents/{document.id}/file"
            logger.info("Imported document: %s", title)
        session.commit()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ingest_documents()

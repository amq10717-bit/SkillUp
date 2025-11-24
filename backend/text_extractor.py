import os
import docx
from pypdf import PdfReader

def extract_content(file_path):
    """
    Extracts text from PDF, DOCX, or TXT files.
    Returns the text as a single string.
    """
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    try:
        # 1. Handle Word Documents (.docx)
        if ext == ".docx":
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            text = "\n".join(full_text)

        # 2. Handle PDFs (.pdf)
        elif ext == ".pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"

        # 3. Handle Text Files (.txt)
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()

        # 4. Fallback / Unsupported
        else:
            print(f"⚠️ Unsupported file format: {ext}")
            return ""

        # Clean up text (remove excessive whitespace)
        return text.strip()

    except Exception as e:
        print(f"❌ Error extracting text from {file_path}: {e}")
        return ""

if __name__ == "__main__":
    # Simple test
    print("Text Extractor Module Loaded")
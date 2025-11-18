from PyPDF2 import PdfReader
from pdf2image import convert_from_bytes
from PIL import Image
import pytesseract

def extract_content(file):
    """
    Extract content from PDF or TXT file
    Args:
        file: Can be either a file object (from Streamlit file_uploader) or a string file path
    """
    text = ""
    
    # Handle string file path
    if isinstance(file, str):
        try:
            with open(file, 'rb') as f:
                reader = PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
                if text.strip():
                    return text.strip()
        except Exception as e:
            print(f"PyPDF2 extraction error from file path: {e}")
            # Try reading as text file if PDF extraction fails
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if content.strip():
                        return content.strip()
            except Exception as txt_error:
                print(f"Text file reading error: {txt_error}")
            return f"Error reading file: {file}. File may not exist or be accessible."
    
    # Handle file object (from Streamlit file_uploader)
    else:
        try:
            reader = PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() or ""
            if text.strip():
                return text.strip()
        except Exception as e:
            print(f"PyPDF2 extraction error from file object: {e}")

        # OCR fallback for file objects
        try:
            file.seek(0)
            images = convert_from_bytes(file.read())

            ocr_text = ""
            for img in images:
                ocr_text += pytesseract.image_to_string(img)

            return ocr_text.strip() if ocr_text.strip() else "No readable text found in the PDF."
        except Exception as e:
            print(f"OCR fallback error: {e}")
            return "Error extracting text from PDF."

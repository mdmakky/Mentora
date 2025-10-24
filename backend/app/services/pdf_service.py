"""
PDF Processing Service
Handles PDF upload, text extraction, and file management
"""

import PyPDF2
from pathlib import Path
from typing import List
import shutil
import uuid
from fastapi import UploadFile


async def extract_pdf_text(pdf_path: str) -> List[str]:
    """
    Extract text from PDF file
    
    Args:
        pdf_path: Path to the PDF file
    
    Returns:
        List of strings, one per page
    """
    pages_text = []
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                pages_text.append(text)
        
        return pages_text
        
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return []


async def save_uploaded_file(file: UploadFile, save_path: Path) -> str:
    """
    Save an uploaded file to disk
    
    Args:
        file: The uploaded file from FastAPI
        save_path: Directory to save the file
    
    Returns:
        Path to the saved file
    """
    # Create unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = save_path / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return str(file_path)


def delete_file(file_path: str) -> bool:
    """
    Delete a file from disk
    
    Args:
        file_path: Path to the file
    
    Returns:
        True if deleted successfully
    """
    try:
        Path(file_path).unlink(missing_ok=True)
        return True
    except Exception as e:
        print(f"Error deleting file: {e}")
        return False

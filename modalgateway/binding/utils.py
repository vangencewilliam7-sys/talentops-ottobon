import io
import logging
import requests
import PyPDF2
from typing import List, Optional

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

logger = logging.getLogger(__name__)

# Global client to be initialized by the host
openai_client = None

def init_rag(client):
    """Initialize RAG utilities with an OpenAI client."""
    global openai_client
    openai_client = client
    logger.info("RAG utilities initialized with OpenAI client.")

def chunk_text(text: str, chunk_size=500, overlap=50) -> List[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    if not words:
        return []
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts using the initialized OpenAI client."""
    if openai_client is None:
        logger.error("RAG utilities not initialized. Call init_rag(client) first.")
        return []
        
    clean_texts = [t.replace("\n", " ") for t in texts]
    if not clean_texts:
        return []
    try:
        resp = openai_client.embeddings.create(
            input=clean_texts, 
            model="text-embedding-3-small",
            timeout=10
        )
        return [d.embedding for d in resp.data]
    except Exception as e:
        logger.error(f"Embedding Error: {e}")
        return []

def parse_file_from_url(url: str) -> str:
    """Download and parse a file (PDF, DOCX, or text) from a URL."""
    if not url: return ""
    try:
        logger.info(f"Downloading for RAG: {url}")
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        
        content_type = resp.headers.get('Content-Type', '').lower()
        url_lower = url.lower()
        file_stream = io.BytesIO(resp.content)

        if url_lower.endswith('.pdf') or 'pdf' in content_type:
            reader = PyPDF2.PdfReader(file_stream)
            text = ""
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
            return text
        
        elif url_lower.endswith('.docx') or 'wordprocessingml' in content_type:
            if DocxDocument is None:
                logger.warning("python-docx not installed. Skipping DOCX.")
                return ""
            doc = DocxDocument(file_stream)
            return "\n".join([p.text for p in doc.paragraphs])
            
        else:
            try:
                return resp.content.decode('utf-8')
            except:
                return resp.content.decode('latin-1', errors='ignore')
    except Exception as e:
        logger.error(f"File Parse Error: {e}")
        return ""

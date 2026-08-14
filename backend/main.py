#pdf convertor stuff 
from fastapi import FastAPI, UploadFile, File
import pypdf
import io
from langchain_text_splitters import RecursiveCharacterTextSplitter

#gemini stuff 
import os
from google import genai
from dotenv import load_dotenv 

app = FastAPI()

load_dotenv() #load enviroment vars from .env file
ai = genai.client(api_key=os.getenv("GEMINI_API_KEY")) 
embeddings = [] 


#set the endpoint for uploading a PDF file
@app.post("/upload")
# file is objects name, class is UploadFile
async def upload_pdf(file: UploadFile = File(...)):
    file_content = await file.read()

    #PDFReader class accepts bytes, str, or file path 

    #PdfReader has a parameter called password where it ignores locked PDF files
    #Next Steps: Create a system where the parameter is the password to unlock the PDF, if its not right, return an error message
    pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))
    
    # 3. Extract text page-by-page, .pages loops through pages in PDF 
    full_text = ""
    for page in pdf_reader.pages:
        extracted = page.extract_text()
        if extracted:
            full_text += extracted + "\n"

    # 4. Split text into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200, #the chunks seperated need an overlap (chunk 2 gets the ending 200 chars of chunk 1) to maintain context for the LLM
        length_function=len
    )
    chunks = text_splitter.split_text(full_text)

    for chunk in chunks:
        response = ai.models.embed_content (
            model="gemini-embedding-001",
            contents = chunk
        )
    embeddings.append(response.embeddings.values)


        
    # 5. Return success and metadata
    return {
        "filename": file.filename,
        "total_pages": len(pdf_reader.pages),
        "total_chunks": len(chunks),
        "preview_first_chunk": chunks[0] if chunks else ""
    }




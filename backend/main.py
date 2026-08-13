from fastapi import FastAPI, UploadFile, File
import pypdf
import io
from langchain_text_splitters import RecursiveCharacterTextSplitter

app = FastAPI()

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
    # This strategy provides a solid balance between keeping context intact and managing chunk size
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200, #the chunks seperated need an overlap (chunk 2 gets the ending 200 chars of chunk 1) to maintain context for the LLM
        length_function=len
    )
    chunks = text_splitter.split_text(full_text)

    for chunk in chunks:
        print(f'Chunk: {chunks.index(chunk) + 1}\n{chunk}')
    # 5. Return success and metadata
    return {
        "filename": file.filename,
        "total_pages": len(pdf_reader.pages),
        "total_chunks": len(chunks),
        "preview_first_chunk": chunks[0] if chunks else ""
    }




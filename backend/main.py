#pdf convertor stuff 
from fastapi import FastAPI, UploadFile, File
import pypdf
import io
from langchain_text_splitters import RecursiveCharacterTextSplitter

#gemini stuff 
import os
from google import genai
from dotenv import load_dotenv 

#query 
from pydantic import BaseModel

#supabase
from supabase import create_client, Client

app = FastAPI()

load_dotenv() #load enviroment vars from .env file
ai = genai.Client(api_key=os.getenv("GEMINI_API_KEY")) 

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase_client: Client = create_client(supabase_url, supabase_key)


#pydantic checks if its a string, and converts it if its not 
class QueryRequest(BaseModel):
    question: str 

@app.post("/query")
async def query_rag(request: QueryRequest):
    # 1. Embed the user's question into a vector using the same model
    embed_response = ai.models.embed_content(
        model="gemini-embedding-001",
        contents=request.question
    )
    # The SDK returns a list, so we grab the first item's values
    query_embedding = embed_response.embeddings[0].values 

    # 2. Search Supabase for the 5 most relevant document chunks
    search_result = supabase_client.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": 5
        }
    ).execute()
    
    matched_chunks = search_result.data

    # 3. Handle the case where no documents match
    if not matched_chunks:
        return {
            "question": request.question,
            "answer": "I couldn't find any relevant information in the uploaded documents.",
            "sources": []
        }

    # 4. Stitch the matched chunks together into a single "Context" string
    context_text = ""
    for chunk in matched_chunks:
        context_text += f"Document: {chunk['filename']}\nContent: {chunk['content']}\n\n---\n\n"

    # 5. Build a strict prompt for the LLM
    prompt = f"""
    You are a helpful AI research assistant. Answer the user's question using ONLY the context provided below. 
    If the context does not contain the answer, say "I cannot answer this based on the provided documents."
    Do not use outside knowledge.

    Context from uploaded documents:
    {context_text}

    User Question: {request.question}
    Answer:
    """

    # 6. Ask Gemini to generate the final text answer
    llm_response = ai.models.generate_content(
        model="gemini-3.7-flash", 
        contents=prompt
    )

    # 7. Return the final answer along with the source citations
    return {
        "question": request.question,
        "answer": llm_response.text,
        "sources": [
            {"filename": chunk["filename"], "similarity": chunk["similarity"]} 
            for chunk in matched_chunks
        ]
    }
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
    embeddings = [] 

    for chunk in chunks:
        response = ai.models.embed_content (
            model="gemini-embedding-001",
            contents = chunk
        )
        embeddings.append(response.embeddings[0].values)
    
    records = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        records.append({
            "filename": file.filename,
            "chunk_index": idx,
            "content": chunk,
            "embedding": embedding
        })
        
    # Bulk insert all chunks into the database
    if records:
        supabase_client.table("document_chunks").insert(records).execute()

        
    # 5. Return success and metadata
    return {
        "filename": file.filename,
        "total_pages": len(pdf_reader.pages),
        "total_chunks": len(chunks),
        "preview_first_chunk": chunks[0] if chunks else ""
    }




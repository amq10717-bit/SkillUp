import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

# 1. Load Environment Variables
load_dotenv()
GOOGLE_API_KEY = os.getenv("VITE_GEMINI_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("❌ GOOGLE_API_KEY is missing! Check your .env file.")

def generate_quiz_from_document(file_path: str, topic: str, difficulty: str, count: int):
    """
    Generates quiz questions based strictly on the document content.
    """
    print(f"🔍 Loading file for Quiz: {file_path}")

    # --- 1. Loader Logic ---
    if file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith(".docx"):
        loader = Docx2txtLoader(file_path)
    elif file_path.endswith(".txt"):
        loader = TextLoader(file_path)
    else:
        raise ValueError("Unsupported format.")
    
    docs = loader.load()
    full_text = "\n\n".join([d.page_content for d in docs])

    if not full_text.strip():
        raise ValueError("Document appears empty.")

    # --- 2. Prompt Engineering ---
    system_prompt = (
        "You are an expert academic examiner. Your task is to generate multiple-choice questions "
        "based STRICTLY on the provided reference document."
    )

    human_prompt = (
        f"Subject/Context: {topic}\n"
        f"Difficulty: {difficulty}\n"
        f"Number of Questions: {count}\n\n"
        "Reference Document Content:\n"
        f"{full_text}\n\n"
        "Output strictly valid JSON array. Each object must have:\n"
        "- 'questionText': The question string.\n"
        "- 'options': An array of exactly 4 strings.\n"
        "- 'correctAnswer': The integer index (0, 1, 2, or 3) of the correct option.\n"
        "Do not include markdown formatting (```json). Return raw JSON only."
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt),
    ])

    # --- 3. LLM Invocation ---
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash", 
        temperature=0.5,
        google_api_key=os.getenv("VITE_GEMINI_API_KEY")
    )
    
    chain = prompt | llm
    response = chain.invoke({})
    
    return response.content

def generate_assignment_from_document(file_path: str, topic: str, difficulty: str):
    """
    Generates an assignment by sending the full document context to Gemini.
    (Bypasses Embedding limits by utilizing Gemini 1.5's long context window)
    """
    print(f"🔍 Loading file: {file_path}")

    # --- 2. Smart Loader Selection ---
    if file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith(".docx"):
        loader = Docx2txtLoader(file_path)
    elif file_path.endswith(".txt"):
        loader = TextLoader(file_path)
    else:
        raise ValueError("Unsupported file format. Please upload PDF, DOCX, or TXT.")
    
    try:
        docs = loader.load()
    except Exception as e:
        raise ValueError(f"Error loading document: {str(e)}")

    # --- 3. Combine Text (Long Context Strategy) ---
    # Instead of chunking and embedding, we just join all text.
    # Gemini 1.5 Flash can handle ~1 million tokens, so this works for almost any book/file.
    full_text = "\n\n".join([d.page_content for d in docs])

    if not full_text.strip():
        raise ValueError("The document appears to be empty or could not be read.")

    print(f"📄 Document loaded. Length: {len(full_text)} characters. Sending to AI...")

    # --- 4. Define Prompt ---
    system_prompt = (
        "You are an expert academic tutor. You will be provided with a reference document. "
        "Your task is to create a structured assignment based STRICTLY on that document."
    )

    human_prompt = (
        f"Instructions: {topic}\n"
        f"Difficulty Level: {difficulty}\n\n"
        "Reference Document Content:\n"
        f"{full_text}\n\n"
        "Generate a JSON response with these exact keys: title, description, instructions (array of strings), "
        "learningObjectives (array of strings), totalMarks (number), estimatedDuration (number in minutes), teacherSolution (string). "
        "Do not use markdown formatting (no ```json). Return raw JSON only."
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt),
    ])

    # --- 5. Run Chain ---
    # We use the Chat model directly, skipping the VectorStore/Embedding steps
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash", 
        temperature=0.5,
        google_api_key=GOOGLE_API_KEY
    )
    
    chain = prompt | llm

    # Invoke
    response = chain.invoke({})
    
    return response.content
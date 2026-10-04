import os
import json
import re
from typing import Any

import pymupdf
import pytesseract
from PIL import Image
import networkx as nx
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import (
    User,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    Badge,
)
from schemas import QuizSubmission
from services.quiz_service import submit_quiz
from gamification import (
    get_total_xp,
    get_total_coins,
    get_level,
    add_xp,
    add_coins,
    update_streak,
    apply_streak_reward,
    check_badges,
)
from auth import register_user, login_user


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

MODEL_NAME = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-20b"
)

# OCR settings for scanned/image-only PDFs.
OCR_ENABLED = os.getenv("OCR_ENABLED", "true").lower() in {
    "1", "true", "yes", "on"
}

# Optional Windows/Linux Tesseract executable path.
# Example Windows: C:\\Program Files\\Tesseract-OCR\\tesseract.exe
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "").strip()

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="EduGap AI Backend",
    description="AI-powered learning gap detection backend",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AUTH SCHEMAS
# ============================================================

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)


# ============================================================
# GROQ CLIENT
# ============================================================

client = None

if GROQ_API_KEY:
    client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url=GROQ_BASE_URL,
    )


# ============================================================
# HEALTH
# ============================================================

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "EduGap AI Backend",
        "model": MODEL_NAME,
        "groq_configured": bool(GROQ_API_KEY),
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "groq_configured": bool(GROQ_API_KEY),
        "model": MODEL_NAME,
    }


# ============================================================
# AUTHENTICATION
# ============================================================

@app.post("/auth/register")
def register_endpoint(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Create a real persistent EduGap account."""

    name = request.name.strip()
    email = request.email.strip().lower()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required.",
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email is required.",
        )

    if len(request.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters.",
        )

    user, error = register_user(
        db=db,
        name=name,
        email=email,
        password=request.password,
    )

    if error:
        raise HTTPException(
            status_code=400,
            detail=error,
        )

    return {
        "message": "Account created successfully.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.post("/auth/login")
def login_endpoint(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate an existing EduGap account."""

    user, error = login_user(
        db=db,
        email=request.email,
        password=request.password,
    )

    if error:
        raise HTTPException(
            status_code=401,
            detail=error,
        )

    return {
        "message": "Login successful.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


# ============================================================
# HELPERS
# ============================================================

def require_ai():
    if not GROQ_API_KEY or client is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "GROQ_API_KEY is not configured. "
                "Create a .env file in Backend and add "
                "GROQ_API_KEY=your_key."
            ),
        )


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\x00", " ")

    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )

    text = re.sub(
        r"\n\s*\n\s*\n+",
        "\n\n",
        text,
    )

    return text.strip()


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """
    Extract text from a PDF.

    First tries normal PDF text extraction with PyMuPDF.
    If a page has no embedded text, OCR is automatically used
    for that page. This allows EduGap to read both normal PDFs
    and scanned/image-only PDFs.
    """

    try:
        document = pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        )
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Could not open PDF: {error}",
        )

    pages = []
    ocr_pages = 0

    try:
        for page_number, page in enumerate(document):
            # ----------------------------------------------------
            # 1. Try normal PDF text extraction first.
            # ----------------------------------------------------
            text = clean_text(page.get_text("text") or "")

            if text:
                pages.append(
                    f"[Page {page_number + 1}]\n{text}"
                )
                continue

            # ----------------------------------------------------
            # 2. No embedded text -> OCR the rendered page.
            # ----------------------------------------------------
            if not OCR_ENABLED:
                continue

            try:
                # 200 DPI gives Tesseract enough resolution for
                # classroom notes while keeping processing reasonable.
                matrix = pymupdf.Matrix(200 / 72, 200 / 72)
                pixmap = page.get_pixmap(
                    matrix=matrix,
                    colorspace=pymupdf.csRGB,
                    alpha=False,
                )

                image = Image.frombytes(
                    "RGB",
                    [pixmap.width, pixmap.height],
                    pixmap.samples,
                )

                ocr_text = pytesseract.image_to_string(
                    image,
                    config="--psm 6",
                )

                ocr_text = clean_text(ocr_text)

                if ocr_text:
                    ocr_pages += 1
                    pages.append(
                        f"[Page {page_number + 1}]\n{ocr_text}"
                    )

            except pytesseract.TesseractNotFoundError:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "OCR is required for this PDF, but Tesseract OCR "
                        "is not installed or is not available in PATH. "
                        "Install Tesseract OCR, restart the backend, and "
                        "try the PDF again. If Tesseract is installed in a "
                        "custom location, set TESSERACT_CMD in Backend/.env."
                    ),
                )
            except Exception as error:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        f"OCR failed on page {page_number + 1}: {error}"
                    ),
                )

    finally:
        document.close()

    extracted = clean_text(
        "\n\n".join(pages)
    )

    if not extracted:
        if OCR_ENABLED:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text could be extracted from this PDF, "
                    "even after OCR. The pages may be blank, extremely "
                    "low-resolution, or contain unsupported content."
                ),
            )

        raise HTTPException(
            status_code=400,
            detail=(
                "No readable text was found in this PDF. "
                "Enable OCR_ENABLED=true to read scanned PDFs."
            ),
        )

    print(
        f"PDF text extraction complete: {len(pages)} page(s) read, "
        f"{ocr_pages} page(s) read with OCR."
    )

    return extracted


def limit_source_text(
    text: str,
    max_chars: int = 30000,
) -> str:

    if len(text) <= max_chars:
        return text

    first_part = int(max_chars * 0.75)
    last_part = max_chars - first_part

    return (
        text[:first_part]
        + "\n\n[...middle of document omitted...]\n\n"
        + text[-last_part:]
    )


def extract_json_from_response(
    content: str,
) -> dict:

    if not content:
        raise ValueError(
            "AI returned an empty response."
        )

    content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    match = re.search(
        r"\{.*\}",
        content,
        flags=re.DOTALL,
    )

    if match:
        try:
            return json.loads(
                match.group(0)
            )
        except json.JSONDecodeError:
            pass

    raise ValueError(
        "AI returned data that could not be parsed as JSON."
    )


# ============================================================
# GROQ CALL
# ============================================================

def call_groq(
    system_prompt: str,
    user_prompt: str,
    schema_name: str,
    schema: dict,
    max_completion_tokens: int = 12000,
) -> dict:

    require_ai()

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,

            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],

            # GPT-OSS supports low reasoning effort.
            # This leaves more of the completion budget
            # available for the actual JSON response.
            reasoning_effort="low",

            temperature=0.2,

            # Important:
            # prevents the model from stopping before
            # completing the structured JSON.
            max_completion_tokens=max_completion_tokens,

            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": True,
                    "schema": schema,
                },
            },
        )

    except Exception as error:

        error_text = str(error)

        if (
            "max completion tokens" in error_text.lower()
            or "max_completion_tokens" in error_text.lower()
            or "max completion" in error_text.lower()
        ):
            raise HTTPException(
                status_code=502,
                detail=(
                    "Groq reached the completion limit while "
                    "generating the structured learning analysis. "
                    "The request has been shortened; please try "
                    "the upload again."
                ),
            )

        raise HTTPException(
            status_code=502,
            detail=f"Groq AI request failed: {error}",
        )

    try:
        content = response.choices[0].message.content
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Invalid Groq response: {error}",
        )

    try:
        return extract_json_from_response(
            content
        )
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse Groq response: {error}",
        )


# ============================================================
# KNOWLEDGE GRAPH
# ============================================================

def build_graph(
    concepts: list[dict],
) -> dict:

    graph = nx.DiGraph()

    for concept in concepts:

        name = str(
            concept.get(
                "name",
                "",
            )
        ).strip()

        if not name:
            continue

        graph.add_node(name)

    for concept in concepts:

        target = str(
            concept.get(
                "name",
                "",
            )
        ).strip()

        if not target:
            continue

        prerequisites = concept.get(
            "prerequisites",
            [],
        )

        if not isinstance(
            prerequisites,
            list,
        ):
            continue

        for prerequisite in prerequisites:

            prerequisite = str(
                prerequisite
            ).strip()

            if not prerequisite:
                continue

            graph.add_node(
                prerequisite
            )

            graph.add_edge(
                prerequisite,
                target,
            )

    edges = []

    for source, target in graph.edges():

        edges.append(
            {
                "from": source,
                "to": target,
            }
        )

    return {
        "nodes": list(
            graph.nodes()
        ),
        "edges": edges,
        "node_count": graph.number_of_nodes(),
        "edge_count": graph.number_of_edges(),
    }


# ============================================================
# ANALYSIS SCHEMA
# ============================================================

# The first AI call only discovers the learning structure.
# Questions are generated separately so the number of questions
# scales naturally with the number of important concepts.
ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
        },
        "summary": {
            "type": "string",
        },
        "concepts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                    },
                    "description": {
                        "type": "string",
                    },
                    "prerequisites": {
                        "type": "array",
                        "items": {
                            "type": "string",
                        },
                    },
                },
                "required": [
                    "name",
                    "description",
                    "prerequisites",
                ],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "title",
        "summary",
        "concepts",
    ],
    "additionalProperties": False,
}


def build_question_schema(question_count: int) -> dict:
    """Create a strict schema for 1-2 questions per requested concept."""

    question_count = max(1, min(question_count, 8))

    return {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "minItems": question_count,
                "maxItems": question_count,
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "string",
                        },
                        "options": {
                            "type": "array",
                            "minItems": 4,
                            "maxItems": 4,
                            "items": {
                                "type": "string",
                            },
                        },
                        "answer": {
                            "type": "string",
                        },
                        "concept": {
                            "type": "string",
                        },
                        "explanation": {
                            "type": "string",
                        },
                    },
                    "required": [
                        "question",
                        "options",
                        "answer",
                        "concept",
                        "explanation",
                    ],
                    "additionalProperties": False,
                },
            },
        },
        "required": [
            "questions",
        ],
        "additionalProperties": False,
    }


# ============================================================
# QUESTION GENERATION
# ============================================================

QUESTIONS_PER_CONCEPT = 2
CONCEPTS_PER_QUESTION_BATCH = 4


def normalize_concepts(concepts: list[dict]) -> list[dict]:
    """Remove duplicate/empty concepts while preserving AI order."""

    normalized = []
    concept_names = set()

    for concept in concepts:
        name = str(concept.get("name", "")).strip()

        if not name:
            continue

        name_key = name.lower()

        if name_key in concept_names:
            continue

        concept_names.add(name_key)

        prerequisites = concept.get("prerequisites", [])

        if not isinstance(prerequisites, list):
            prerequisites = []

        prerequisites = [
            str(item).strip()
            for item in prerequisites
            if str(item).strip()
        ]

        normalized.append(
            {
                "name": name,
                "description": str(
                    concept.get("description", "")
                ).strip(),
                "prerequisites": prerequisites,
            }
        )

    return normalized


def normalize_questions(
    questions: list[dict],
    allowed_concepts: list[dict],
) -> list[dict]:
    """Validate the question shape and keep only material-grounded results."""

    allowed_by_key = {
        concept["name"].lower(): concept["name"]
        for concept in allowed_concepts
    }

    normalized = []
    seen_questions = set()
    concept_counts = {}

    for question in questions:
        question_text = str(
            question.get("question", "")
        ).strip()

        options = question.get("options", [])
        answer = str(
            question.get("answer", "")
        ).strip()
        concept = str(
            question.get("concept", "")
        ).strip()
        explanation = str(
            question.get("explanation", "")
        ).strip()

        if not question_text:
            continue

        if not isinstance(options, list):
            continue

        options = [
            str(option).strip()
            for option in options
            if str(option).strip()
        ]

        if len(options) != 4:
            continue

        if len({option.lower() for option in options}) != 4:
            continue

        if answer not in options:
            continue

        canonical_concept = allowed_by_key.get(concept.lower())

        if not canonical_concept:
            continue

        question_key = re.sub(
            r"\s+",
            " ",
            question_text.lower(),
        )

        if question_key in seen_questions:
            continue

        current_count = concept_counts.get(
            canonical_concept.lower(),
            0,
        )

        # Never allow more than two questions for one concept.
        if current_count >= QUESTIONS_PER_CONCEPT:
            continue

        seen_questions.add(question_key)
        concept_counts[canonical_concept.lower()] = current_count + 1

        normalized.append(
            {
                "question": question_text,
                "options": options,
                "answer": answer,
                "concept": canonical_concept,
                "explanation": explanation,
            }
        )

    return normalized


def generate_questions_for_concept_batch(
    source_text: str,
    concepts: list[dict],
) -> list[dict]:
    """Generate exactly two questions per concept in a small AI call."""

    requested_count = len(concepts) * QUESTIONS_PER_CONCEPT
    schema = build_question_schema(requested_count)

    concept_lines = []

    for index, concept in enumerate(concepts, start=1):
        concept_lines.append(
            f"{index}. {concept['name']}\n"
            f"Description: {concept['description']}\n"
            f"Prerequisites: {json.dumps(concept['prerequisites'])}"
        )

    concepts_text = "\n\n".join(concept_lines)

    system_prompt = """
You are the question-generation engine for EduGap AI.

The supplied learning material is the ONLY source of truth.

For EVERY concept listed by the user, generate EXACTLY 2 important
multiple-choice questions. This means each concept must receive two
questions, and no concept may be skipped.

Rules:
1. Use only information explicitly supported by the supplied material.
2. Do not introduce outside facts, examples, terminology, or assumptions.
3. Questions must test understanding, application, comparison, or recognition
   of something actually taught in the material.
4. Each question must belong to exactly one of the listed concepts.
5. Each question must have exactly 4 distinct options.
6. Exactly one option must be correct.
7. The answer must exactly match one of the four options.
8. The two questions for a concept must test different aspects of that concept.
9. Do not repeat or paraphrase the same question.
10. Keep questions concise and suitable for a student quiz.
11. Keep explanations to one short sentence.
12. Do not create questions for concepts that are not in the supplied list.
13. Return only the requested JSON structure.
"""

    user_prompt = f"""
LEARNING MATERIAL
=================
{source_text}

CONCEPTS TO TEST
================
{concepts_text}

TASK
====
Generate exactly 2 important questions for EVERY concept above.

If there are {len(concepts)} concepts, return exactly {requested_count}
questions total: two for each concept.

Before returning the JSON, make sure every listed concept appears exactly
two times in the generated questions.
"""

    result = call_groq(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema_name="edugap_concept_questions",
        schema=schema,
        max_completion_tokens=6000,
    )

    return result.get("questions", [])


def generate_single_concept_questions(
    source_text: str,
    concept: dict,
) -> list[dict]:
    """Fallback used if a batch misses a concept."""

    schema = build_question_schema(QUESTIONS_PER_CONCEPT)

    system_prompt = """
You are the EduGap AI question-generation engine.

Generate exactly 2 important multiple-choice questions for the target
concept using ONLY the supplied learning material.

Rules:
1. Use only the supplied material.
2. Generate exactly 2 different questions.
3. Test different aspects of the target concept.
4. Use exactly 4 distinct options per question.
5. Exactly one option must be correct.
6. The answer must exactly match one option.
7. Do not use outside knowledge.
8. Keep explanations to one short sentence.
9. Return only JSON.
"""

    user_prompt = f"""
LEARNING MATERIAL
=================
{source_text}

TARGET CONCEPT
==============
Name: {concept['name']}
Description: {concept['description']}
Prerequisites: {json.dumps(concept['prerequisites'])}

Generate exactly 2 important questions for this concept.
"""

    result = call_groq(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema_name="edugap_single_concept_questions",
        schema=schema,
        max_completion_tokens=3500,
    )

    return result.get("questions", [])


# ============================================================
# ANALYZE MATERIAL
# ============================================================

def analyze_learning_material(
    source_text: str,
) -> dict:

    source_text = limit_source_text(
        clean_text(source_text),
        30000,
    )

    # --------------------------------------------------------
    # STEP 1: DISCOVER CONCEPTS AND THE KNOWLEDGE GRAPH
    # --------------------------------------------------------

    system_prompt = """
You are EduGap AI, an educational diagnostic engine.

Analyze ONLY the supplied learning material.

Create a compact learning model for a student.

You must:
1. Identify the important teachable concepts.
2. Give each concept a short description.
3. Identify prerequisite relationships between concepts.
4. Keep concepts meaningful and avoid trivial duplicates.
5. Do not invent concepts that are not supported by the material.
6. Keep descriptions short.
7. Return only the requested JSON structure.

IMPORTANT:
Do NOT generate quiz questions in this step.
"""

    user_prompt = f"""
Analyze this learning material:

BEGIN MATERIAL
==============
{source_text}
END MATERIAL

Return:
- a short title
- a short summary
- every important teachable concept
- prerequisite relationships between those concepts

Do not generate questions yet.
"""

    result = call_groq(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema_name="edugap_learning_analysis",
        schema=ANALYSIS_SCHEMA,
        max_completion_tokens=5000,
    )

    normalized_concepts = normalize_concepts(
        result.get("concepts", [])
    )

    if not normalized_concepts:
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI could not identify concepts "
                "from the uploaded material."
            ),
        )

    # --------------------------------------------------------
    # STEP 2: GENERATE 2 QUESTIONS PER CONCEPT
    # --------------------------------------------------------

    normalized_questions = []

    for start in range(
        0,
        len(normalized_concepts),
        CONCEPTS_PER_QUESTION_BATCH,
    ):
        concept_batch = normalized_concepts[
            start:start + CONCEPTS_PER_QUESTION_BATCH
        ]

        raw_questions = generate_questions_for_concept_batch(
            source_text=source_text,
            concepts=concept_batch,
        )

        normalized_questions.extend(
            normalize_questions(
                raw_questions,
                concept_batch,
            )
        )

    # --------------------------------------------------------
    # STEP 3: FILL ANY MISSED CONCEPTS
    # --------------------------------------------------------

    question_counts = {}

    for question in normalized_questions:
        key = question["concept"].lower()
        question_counts[key] = question_counts.get(key, 0) + 1

    for concept in normalized_concepts:
        key = concept["name"].lower()
        count = question_counts.get(key, 0)

        if count >= QUESTIONS_PER_CONCEPT:
            continue

        raw_questions = generate_single_concept_questions(
            source_text=source_text,
            concept=concept,
        )

        fallback_questions = normalize_questions(
            raw_questions,
            [concept],
        )

        # Avoid going above two questions for this concept.
        remaining = QUESTIONS_PER_CONCEPT - count

        for question in fallback_questions[:remaining]:
            normalized_questions.append(question)
            count += 1

        question_counts[key] = count

    # --------------------------------------------------------
    # STEP 4: FINAL VALIDATION
    # --------------------------------------------------------

    missing_concepts = [
        concept["name"]
        for concept in normalized_concepts
        if question_counts.get(
            concept["name"].lower(),
            0,
        ) < 1
    ]

    if missing_concepts:
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI could not generate questions for every important "
                "concept. Missing: "
                + ", ".join(missing_concepts)
            ),
        )

    graph = build_graph(
        normalized_concepts
    )

    return {
        "source_text": source_text,
        "title": result.get(
            "title",
            "Learning Material",
        ),
        "summary": result.get(
            "summary",
            "",
        ),
        "concepts": normalized_concepts,
        "questions": normalized_questions,
        "graph": graph,
    }


# ============================================================
# PDF ENDPOINT
# ============================================================

@app.post("/analyze-pdf")
async def analyze_pdf(
    file: UploadFile = File(...),
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file was uploaded.",
        )

    filename = file.filename.lower()

    if not filename.endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file.",
        )

    try:

        pdf_bytes = await file.read()

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=f"Could not read uploaded file: {error}",
        )

    if not pdf_bytes:

        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF is empty.",
        )

    # 25 MB maximum upload
    max_size = 25 * 1024 * 1024

    if len(pdf_bytes) > max_size:

        raise HTTPException(
            status_code=413,
            detail=(
                "PDF is too large. "
                "Please upload a PDF under 25 MB."
            ),
        )

    source_text = extract_pdf_text(
        pdf_bytes
    )

    result = analyze_learning_material(
        source_text
    )

    result["filename"] = file.filename

    return result


# ============================================================
# TEXT ENDPOINT
# ============================================================

class TextAnalysisRequest(BaseModel):

    text: str


@app.post("/analyze-text")
async def analyze_text(
    request: TextAnalysisRequest,
):

    text = clean_text(
        request.text
    )

    if not text:

        raise HTTPException(
            status_code=400,
            detail="No learning text was provided.",
        )

    if len(text) < 50:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please provide at least a small section "
                "of meaningful learning material."
            ),
        )

    result = analyze_learning_material(
        text
    )

    return result


# ============================================================
# REAL QUIZ DATABASE API
# ============================================================

class QuizCreateQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    answer: str
    concept: str
    explanation: str = ""


class QuizCreateRequest(BaseModel):
    user_id: int
    title: str = "EduGap AI Quiz"
    source_title: str | None = None
    questions: list[QuizCreateQuestion]


@app.post("/quiz/create")
def create_quiz(
    request: QuizCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Store the AI-generated quiz in SQLite.

    The frontend sends the questions returned by /analyze-pdf or
    /analyze-text. The backend assigns permanent question IDs so
    later quiz submissions can be stored against real database rows.
    """

    user = (
        db.query(User)
        .filter(User.id == request.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    if not request.questions:
        raise HTTPException(
            status_code=400,
            detail="Quiz must contain at least one question.",
        )

    quiz = Quiz(
        title=request.title.strip() or "EduGap AI Quiz",
        source_title=request.source_title,
    )

    db.add(quiz)
    db.flush()

    for item in request.questions:
        options = [
            str(option).strip()
            for option in item.options
            if str(option).strip()
        ]

        if len(options) != 4:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail="Every quiz question must contain exactly four options.",
            )

        if item.answer.strip() not in options:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail="Every quiz answer must match one of its four options.",
            )

        question = QuizQuestion(
            quiz_id=quiz.id,
            question=item.question.strip(),
            option_a=options[0],
            option_b=options[1],
            option_c=options[2],
            option_d=options[3],
            correct_answer=item.answer.strip(),
            concept=item.concept.strip(),
        )

        db.add(question)

    db.commit()
    db.refresh(quiz)

    saved_questions = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.id.asc())
        .all()
    )

    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "source_title": quiz.source_title,
        "questions": [
            {
                "id": question.id,
                "question": question.question,
                "options": [
                    question.option_a,
                    question.option_b,
                    question.option_c,
                    question.option_d,
                ],
                "concept": question.concept,
            }
            for question in saved_questions
        ],
    }


@app.post("/quiz/submit")
def submit_quiz_endpoint(
    request: QuizSubmission,
    db: Session = Depends(get_db),
):
    """
    Evaluate a completed quiz and persist the result.

    Score, concept gaps, XP, coins, streak and newly unlocked
    badges are all calculated on the backend.
    """

    user = (
        db.query(User)
        .filter(User.id == request.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    quiz = (
        db.query(Quiz)
        .filter(Quiz.id == request.quiz_id)
        .first()
    )

    if not quiz:
        raise HTTPException(
            status_code=404,
            detail="Quiz not found.",
        )

    try:
        result = submit_quiz(
            db=db,
            user_id=request.user_id,
            quiz_id=request.quiz_id,
            answers=request.answers,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
    except Exception:
        db.rollback()
        raise

    return result


@app.get("/profile/{user_id}")
def get_profile(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Return the persistent learning identity of a user.
    """

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    total_xp = get_total_xp(
        db,
        user_id,
    )

    total_coins = get_total_coins(
        db,
        user_id,
    )

    streak = user.streak

    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "xp": total_xp,
        "level": get_level(total_xp),
        "coins": total_coins,
        "streak": {
            "current": streak.current_streak if streak else 0,
            "longest": streak.longest_streak if streak else 0,
            "last_activity": (
                streak.last_activity.isoformat()
                if streak and streak.last_activity
                else None
            ),
        },
    }


@app.get("/profile/{user_id}/progress")
def get_learning_progress(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Return persistent quiz and concept progress.
    """

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.attempted_at.desc())
        .all()
    )

    return {
        "user_id": user_id,
        "attempts": [
            {
                "attempt_id": attempt.id,
                "quiz_id": attempt.quiz_id,
                "score": attempt.score,
                "total_questions": attempt.total_questions,
                "percentage": attempt.percentage,
                "attempted_at": (
                    attempt.attempted_at.isoformat()
                    if attempt.attempted_at
                    else None
                ),
                "gaps": [
                    result.concept
                    for result in attempt.concept_results
                    if result.is_gap
                ],
            }
            for attempt in attempts
        ],
    }


@app.get("/profile/{user_id}/badges")
def get_user_badges(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return {
        "user_id": user_id,
        "badges": [
            {
                "name": item.badge.name,
                "description": item.badge.description,
                "icon": item.badge.icon,
                "earned_at": (
                    item.earned_at.isoformat()
                    if item.earned_at
                    else None
                ),
            }
            for item in user.badges
        ],
    }


@app.get("/profile/{user_id}/streak")
def get_user_streak(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    streak = user.streak

    return {
        "user_id": user_id,
        "current_streak": streak.current_streak if streak else 0,
        "longest_streak": streak.longest_streak if streak else 0,
        "last_activity": (
            streak.last_activity.isoformat()
            if streak and streak.last_activity
            else None
        ),
    }


@app.get("/profile/{user_id}/coins")
def get_user_coins(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return {
        "user_id": user_id,
        "coins": get_total_coins(
            db,
            user_id,
        ),
    }


# ============================================================
# RETRY SCHEMA
# ============================================================

RETRY_SCHEMA = {
    "type": "object",

    "properties": {

        "question": {
            "type": "string",
        },

        "options": {
            "type": "array",

            "items": {
                "type": "string",
            },
        },

        "answer": {
            "type": "string",
        },

        "concept": {
            "type": "string",
        },

        "explanation": {
            "type": "string",
        },
    },

    "required": [
        "question",
        "options",
        "answer",
        "concept",
        "explanation",
    ],

    "additionalProperties": False,
}


# ============================================================
# RETRY REQUEST
# ============================================================

class RetryRequest(BaseModel):

    source_text: str

    concept: dict[str, Any] | None = None

    previous_questions: list[
        dict[str, Any]
    ] = []


# ============================================================
# GENERATE RETRY
# ============================================================

@app.post("/generate-retry")
async def generate_retry(
    request: RetryRequest,
):

    require_ai()

    source_text = limit_source_text(
        clean_text(
            request.source_text
        ),
        25000,
    )

    concept = request.concept or {}

    concept_name = str(
        concept.get(
            "name",
            "the identified concept",
        )
    ).strip()

    concept_description = str(
        concept.get(
            "description",
            "",
        )
    ).strip()

    prerequisites = concept.get(
        "prerequisites",
        [],
    )

    if not isinstance(
        prerequisites,
        list,
    ):
        prerequisites = []

    previous_questions_text = ""

    for item in request.previous_questions[:5]:

        previous_questions_text += (
            "\n- "
            + str(
                item.get(
                    "question",
                    "",
                )
            ).strip()
        )

    system_prompt = """
You are the retry-assessment engine for EduGap AI.

Create ONE new question to test whether a student improved
their understanding of the target concept.

Rules:

1. Use only the supplied learning material.
2. Focus on the target concept.
3. Test understanding.
4. Create exactly 4 options.
5. Exactly one option is correct.
6. The answer must exactly match an option.
7. Do not repeat previous questions.
8. Keep the explanation very short.
9. Return only the required JSON.
"""

    user_prompt = f"""
LEARNING MATERIAL:

{source_text}

TARGET CONCEPT:

Name:
{concept_name}

Description:
{concept_description}

Prerequisites:
{json.dumps(prerequisites)}

PREVIOUS QUESTIONS:
{previous_questions_text}

Create one new retry question.
Keep the response concise.
"""

    result = call_groq(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema_name="edugap_retry_question",
        schema=RETRY_SCHEMA,
        max_completion_tokens=4000,
    )

    options = result.get(
        "options",
        [],
    )

    answer = str(
        result.get(
            "answer",
            "",
        )
    ).strip()

    if not isinstance(
        options,
        list,
    ):

        raise HTTPException(
            status_code=502,
            detail="AI returned invalid retry options.",
        )

    options = [
        str(option).strip()
        for option in options
        if str(option).strip()
    ]

    if len(options) != 4:

        raise HTTPException(
            status_code=502,
            detail=(
                "AI did not generate exactly four "
                "retry options."
            ),
        )

    if answer not in options:

        raise HTTPException(
            status_code=502,
            detail=(
                "AI generated a retry answer that does "
                "not match an option."
            ),
        )

    return {
        "question": str(
            result.get(
                "question",
                "",
            )
        ).strip(),

        "options": options,

        "answer": answer,

        "concept": str(
            result.get(
                "concept",
                concept_name,
            )
        ).strip(),

        "explanation": str(
            result.get(
                "explanation",
                "",
            )
        ).strip(),
    }


# ============================================================
# RETRY ALIAS
# ============================================================

@app.post("/retry")
async def retry_alias(
    request: RetryRequest,
):

    return await generate_retry(
        request
    )
# ============================================================
# REAL RETRY SUBMISSION
# ============================================================

class RetrySubmitRequest(BaseModel):

    user_id: int

    selected_answer: str

    correct_answer: str

    question: str

    concept: str

    explanation: str = ""


@app.post("/retry/submit")
def submit_retry(
    request: RetrySubmitRequest,
    db: Session = Depends(get_db),
):
    """
    Evaluate a retry challenge and persist the learning reward.

    Retry rewards are stored as real XP/coin transactions.
    Streaks and badges are also updated on the backend.
    """

    # --------------------------------------------------------
    # 1. Verify user
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == request.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    # --------------------------------------------------------
    # 2. Validate submitted data
    # --------------------------------------------------------

    selected_answer = request.selected_answer.strip()
    correct_answer = request.correct_answer.strip()
    question = request.question.strip()
    concept = request.concept.strip()

    if not selected_answer:
        raise HTTPException(
            status_code=400,
            detail="An answer must be selected.",
        )

    if not correct_answer:
        raise HTTPException(
            status_code=400,
            detail="The correct answer is missing.",
        )

    if not question:
        raise HTTPException(
            status_code=400,
            detail="The retry question is missing.",
        )

    if not concept:
        raise HTTPException(
            status_code=400,
            detail="The retry concept is missing.",
        )

    # --------------------------------------------------------
    # 3. Calculate result on backend
    # --------------------------------------------------------

    is_correct = (
        selected_answer == correct_answer
    )

    # --------------------------------------------------------
    # 4. Reward learning effort
    #
    # Correct retry:
    #   +25 XP
    #   +10 coins
    #
    # Incorrect retry:
    #   +10 XP
    #   +5 coins
    #
    # Both count as genuine learning activity.
    # --------------------------------------------------------

    if is_correct:
        xp_reward = 25
        coin_reward = 10
        reward_reason = (
            f"Retry improvement: {concept}"
        )
    else:
        xp_reward = 10
        coin_reward = 5
        reward_reason = (
            f"Retry practice: {concept}"
        )

    add_xp(
        db=db,
        user_id=request.user_id,
        amount=xp_reward,
        reason=reward_reason,
    )

    add_coins(
        db=db,
        user_id=request.user_id,
        amount=coin_reward,
        reason=reward_reason,
    )

    # --------------------------------------------------------
    # 5. Update learning streak
    # --------------------------------------------------------

    streak = update_streak(
        db=db,
        user_id=request.user_id,
    )

    streak_xp = 0
    streak_coins = 0

    # Apply milestone reward if this activity
    # created a rewardable streak.
    streak_xp, streak_coins = apply_streak_reward(
        db=db,
        user_id=request.user_id,
        streak_number=streak.current_streak,
    )

    # --------------------------------------------------------
    # 6. Check badges
    # --------------------------------------------------------

    new_badges = check_badges(
        db=db,
        user_id=request.user_id,
    )

    # --------------------------------------------------------
    # 7. Calculate final persistent totals
    # --------------------------------------------------------

    total_xp = get_total_xp(
        db=db,
        user_id=request.user_id,
    )

    total_coins = get_total_coins(
        db=db,
        user_id=request.user_id,
    )

    level = get_level(
        total_xp
    )

    # --------------------------------------------------------
    # 8. Commit everything atomically
    # --------------------------------------------------------

    db.commit()

    # --------------------------------------------------------
    # 9. Return result to frontend
    # --------------------------------------------------------

    return {
        "correct": is_correct,

        "selected": selected_answer,

        "answer": correct_answer,

        "question": question,

        "concept": concept,

        "explanation": request.explanation.strip(),

        "reward": {
            "xp": xp_reward,
            "coins": coin_reward,
        },

        "streak_reward": {
            "xp": streak_xp,
            "coins": streak_coins,
        },

        "total_xp": total_xp,

        "total_coins": total_coins,

        "level": level,

        "streak": {
            "current": streak.current_streak,
            "longest": streak.longest_streak,
            "last_activity": (
                streak.last_activity.isoformat()
                if streak.last_activity
                else None
            ),
        },

        "new_badges": new_badges,
    }

# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup_event():

    # Create all SQLite tables from models.py.
    Base.metadata.create_all(
        bind=engine
    )

    # Seed the fixed badge definitions once.
    badge_definitions = [
        {
            "name": "First Step",
            "description": "Earn your first 25 XP.",
            "icon": "🌱",
            "requirement": 25,
        },
        {
            "name": "Explorer",
            "description": "Reach 100 XP.",
            "icon": "🧭",
            "requirement": 100,
        },
        {
            "name": "Consistent Learner",
            "description": "Build a 7-day learning streak.",
            "icon": "🔥",
            "requirement": 7,
        },
        {
            "name": "Knowledge Builder",
            "description": "Reach 500 XP.",
            "icon": "📚",
            "requirement": 500,
        },
        {
            "name": "Learning Master",
            "description": "Reach 1000 XP.",
            "icon": "🏆",
            "requirement": 1000,
        },
    ]

    from database import SessionLocal

    db = SessionLocal()

    try:
        for definition in badge_definitions:
            existing = (
                db.query(Badge)
                .filter(
                    Badge.name == definition["name"]
                )
                .first()
            )

            if not existing:
                db.add(
                    Badge(
                        name=definition["name"],
                        description=definition["description"],
                        icon=definition["icon"],
                        requirement=definition["requirement"],
                    )
                )

        db.commit()

    finally:
        db.close()

    print("")
    print("=" * 60)
    print("             EDUGAP AI BACKEND")
    print("=" * 60)

    print(
        f"Model: {MODEL_NAME}"
    )

    print(
        "Groq API:",
        "CONFIGURED"
        if GROQ_API_KEY
        else "NOT CONFIGURED",
    )

    print(
        "OCR:",
        "ENABLED"
        if OCR_ENABLED
        else "DISABLED",
    )

    print(
        "API: http://localhost:8000"
    )

    print(
        "Docs: http://localhost:8000/docs"
    )

    print("=" * 60)
    print("")
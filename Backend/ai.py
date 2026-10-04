import json
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. "
        "Please add your Groq API key to Backend/.env"
    )

client = OpenAI(
    api_key=API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

MODEL = "openai/gpt-oss-120b"


EDUGAP_SCHEMA = {
    "type": "object",
    "properties": {
        "subject": {"type": "string"},
        "chapter": {"type": "string"},

        "concepts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "prerequisites": {
                        "type": "array",
                        "items": {"type": "string"},
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

        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 4,
                        "maxItems": 4,
                    },
                    "answer": {"type": "string"},
                    "concept": {"type": "string"},
                },
                "required": [
                    "question",
                    "options",
                    "answer",
                    "concept",
                ],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "subject",
        "chapter",
        "concepts",
        "questions",
    ],
    "additionalProperties": False,
}


RETRY_SCHEMA = {
    "type": "object",
    "properties": {
        "question": {
            "type": "string"
        },
        "options": {
            "type": "array",
            "items": {
                "type": "string"
            },
            "minItems": 4,
            "maxItems": 4,
        },
        "answer": {
            "type": "string"
        },
        "concept": {
            "type": "string"
        },
    },
    "required": [
        "question",
        "options",
        "answer",
        "concept",
    ],
    "additionalProperties": False,
}


def analyze_learning_material(
    text: str
) -> dict:

    if not text or not text.strip():
        raise ValueError(
            "Learning material is empty."
        )

    text = text.strip()

    if len(text) > 60000:
        text = text[:60000]

    prompt = f"""
You are EduGap AI, an educational knowledge-gap
detection engine.

Analyze ONLY the learning material supplied below.

Your task is to build a prerequisite knowledge graph
and create a diagnostic quiz that can identify a
student's learning gaps.

LEARNING MATERIAL
=================

{text}

=================

KNOWLEDGE GRAPH INSTRUCTIONS
============================

1. Identify the subject.

2. Identify the chapter or main topic.

3. Extract the most important concepts.

4. For every concept:
   - Give a clear concept name.
   - Give a student-friendly description.
   - Identify prerequisite concepts.
   - Every prerequisite MUST also exist in the
     concepts list.

5. Create meaningful prerequisite relationships.

6. Keep the concept list focused on the supplied
   learning material.

QUIZ INSTRUCTIONS
=================

Create EXACTLY 5 multiple-choice questions.

Each question MUST:

- Have exactly 4 options.
- Have exactly one correct answer.
- Have the answer exactly match one option.
- Be based ONLY on the supplied material.
- Test understanding whenever possible.
- Be mapped to one concept from the concepts list.
- Help identify a student's weak concept.

IMPORTANT
=========

Do not use information that is not present in the
supplied material.

Do not invent unrelated concepts.

Return ONLY the requested structured JSON.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are EduGap AI. "
                        "Return only the requested "
                        "structured JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "edugap_analysis",
                    "strict": True,
                    "schema": EDUGAP_SCHEMA,
                },
            },
            temperature=0.2,
        )

    except Exception as exc:
        print(
            "GROQ API ERROR:",
            repr(exc)
        )

        raise RuntimeError(
            f"Groq API request failed: {exc}"
        ) from exc

    try:
        output = (
            response
            .choices[0]
            .message
            .content
        )

    except Exception as exc:
        raise RuntimeError(
            "Could not read Groq response."
        ) from exc

    if not output:
        raise RuntimeError(
            "Groq returned an empty response."
        )

    try:
        return json.loads(output)

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Groq returned invalid JSON."
        ) from exc


def generate_retry_question(
    material: str,
    concept: dict
) -> dict:

    if not material or not material.strip():
        raise ValueError(
            "Learning material is empty."
        )

    if not concept or not concept.get("name"):
        raise ValueError(
            "A valid learning concept is required."
        )

    material = material.strip()

    if len(material) > 50000:
        material = material[:50000]

    concept_name = concept.get(
        "name",
        ""
    )

    description = concept.get(
        "description",
        ""
    )

    prerequisites = concept.get(
        "prerequisites",
        []
    )

    prompt = f"""
You are EduGap AI.

Create ONE focused retry question to test whether
a student has improved their understanding of a
specific learning gap.

LEARNING MATERIAL
=================

{material}

TARGET CONCEPT
==============

Name:
{concept_name}

Description:
{description}

Prerequisites:
{", ".join(prerequisites)}

QUESTION REQUIREMENTS
====================

Create exactly ONE multiple-choice question.

The question must:

- Directly test the target concept.
- Be based ONLY on the supplied learning material.
- Have exactly 4 options.
- Have exactly one correct answer.
- Have the answer exactly match one option.
- Test understanding rather than simple word matching.
- Be appropriate for a student studying this material.
- Be different from a basic definition question when
  possible.
- Use the target concept as the value of "concept".

Do NOT introduce information that is absent from the
learning material.

Return ONLY the structured JSON.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are EduGap AI. "
                        "Generate one focused educational "
                        "retry question and return only "
                        "structured JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "edugap_retry",
                    "strict": True,
                    "schema": RETRY_SCHEMA,
                },
            },
            temperature=0.3,
        )

    except Exception as exc:
        print(
            "GROQ RETRY ERROR:",
            repr(exc)
        )

        raise RuntimeError(
            f"Groq retry request failed: {exc}"
        ) from exc

    try:
        output = (
            response
            .choices[0]
            .message
            .content
        )

    except Exception as exc:
        raise RuntimeError(
            "Could not read Groq retry response."
        ) from exc

    if not output:
        raise RuntimeError(
            "Groq returned an empty retry response."
        )

    try:
        return json.loads(output)

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Groq returned invalid retry JSON."
        ) from exc
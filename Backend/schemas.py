from typing import List, Dict

from pydantic import BaseModel


# ============================================================
# QUIZ SUBMISSION
# ============================================================

class QuizAnswer(BaseModel):
    question_id: int
    answer: str


class QuizSubmission(BaseModel):
    user_id: int
    quiz_id: int
    answers: List[QuizAnswer]


# ============================================================
# CONCEPT RESULT
# ============================================================

class ConceptResultResponse(BaseModel):
    concept: str
    correct: int
    total: int
    percentage: float
    is_gap: bool


# ============================================================
# QUIZ RESULT
# ============================================================

class QuizResultResponse(BaseModel):
    attempt_id: int

    score: int

    total_questions: int

    percentage: float

    xp_earned: int

    coins_earned: int

    current_streak: int

    longest_streak: int

    gaps: List[str]

    concept_results: List[ConceptResultResponse]

    new_badges: List[str]
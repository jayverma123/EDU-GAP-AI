from sqlalchemy.orm import Session

from models import (
    QuizAttempt,
    QuizQuestion,
    ConceptResult,
)

from gamification import (
    add_xp,
    add_coins,
    update_streak,
    apply_streak_reward,
    check_badges,
)


# ============================================================
# CALCULATE QUIZ RESULT
# ============================================================

def submit_quiz(
    db: Session,
    user_id: int,
    quiz_id: int,
    answers: list,
):

    questions = (
        db.query(QuizQuestion)
        .filter(
            QuizQuestion.quiz_id == quiz_id
        )
        .all()
    )

    if not questions:
        raise ValueError(
            "Quiz does not contain any questions."
        )

    answer_map = {
        answer.question_id: answer.answer
        for answer in answers
    }

    score = 0

    concept_stats = {}

    # --------------------------------------------------------
    # CHECK EACH QUESTION
    # --------------------------------------------------------

    for question in questions:

        user_answer = answer_map.get(
            question.id
        )

        is_correct = (
            user_answer is not None
            and user_answer.strip().lower()
            == question.correct_answer.strip().lower()
        )

        if is_correct:
            score += 1

        concept = question.concept.strip()

        if concept not in concept_stats:
            concept_stats[concept] = {
                "correct": 0,
                "total": 0,
            }

        concept_stats[concept]["total"] += 1

        if is_correct:
            concept_stats[concept]["correct"] += 1

    total_questions = len(questions)

    percentage = round(
        (score / total_questions) * 100,
        2,
    )

    # --------------------------------------------------------
    # SAVE QUIZ ATTEMPT
    # --------------------------------------------------------

    attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        score=score,
        total_questions=total_questions,
        percentage=percentage,
    )

    db.add(attempt)

    db.flush()

    # --------------------------------------------------------
    # CONCEPT RESULTS
    # --------------------------------------------------------

    gaps = []

    concept_results = []

    for concept, stats in concept_stats.items():

        correct = stats["correct"]
        total = stats["total"]

        concept_percentage = round(
            (correct / total) * 100,
            2,
        )

        # Below 60% = learning gap
        is_gap = concept_percentage < 60

        result = ConceptResult(
            attempt_id=attempt.id,
            concept=concept,
            correct=correct,
            total=total,
            percentage=concept_percentage,
            is_gap=is_gap,
        )

        db.add(result)

        concept_results.append(result)

        if is_gap:
            gaps.append(concept)

    # --------------------------------------------------------
    # BASE XP
    # --------------------------------------------------------

    xp_earned = 10

    if percentage >= 80:
        xp_earned += 30

    elif percentage >= 60:
        xp_earned += 20

    else:
        xp_earned += 10

    # --------------------------------------------------------
    # IMPROVEMENT / LEARNING XP
    # --------------------------------------------------------

    if gaps:
        xp_earned += len(gaps) * 5

    add_xp(
        db,
        user_id,
        xp_earned,
        "Quiz completion",
    )

    # --------------------------------------------------------
    # COINS
    # --------------------------------------------------------

    coins_earned = 5

    if percentage >= 80:
        coins_earned += 15

    elif percentage >= 60:
        coins_earned += 10

    add_coins(
        db,
        user_id,
        coins_earned,
        "Quiz completion",
    )

    # --------------------------------------------------------
    # STREAK
    # --------------------------------------------------------

    streak = update_streak(
        db,
        user_id,
    )

    streak_xp, streak_coins = (
        apply_streak_reward(
            db,
            user_id,
            streak.current_streak,
        )
    )

    xp_earned += streak_xp
    coins_earned += streak_coins

    # --------------------------------------------------------
    # BADGES
    # --------------------------------------------------------

    new_badges = check_badges(
        db,
        user_id,
    )

    db.commit()

    return {
        "attempt_id": attempt.id,

        "score": score,

        "total_questions": total_questions,

        "percentage": percentage,

        "xp_earned": xp_earned,

        "coins_earned": coins_earned,

        "current_streak": streak.current_streak,

        "longest_streak": streak.longest_streak,

        "gaps": gaps,

        "concept_results": [
            {
                "concept": result.concept,
                "correct": result.correct,
                "total": result.total,
                "percentage": result.percentage,
                "is_gap": result.is_gap,
            }
            for result in concept_results
        ],

        "new_badges": new_badges,
    }
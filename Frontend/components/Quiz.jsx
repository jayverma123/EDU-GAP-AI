"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
    createQuiz,
    submitQuiz,
    getStoredUserId,
} from "../lib/api";

export default function Quiz({
    questions = [],
    onComplete,
}) {
    const router = useRouter();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [quizId, setQuizId] = useState(null);
    const [dbQuestions, setDbQuestions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    /* ============================================================
       CURRENT QUESTION
    ============================================================ */

    const currentQuestion =
        dbQuestions[currentIndex] || questions[currentIndex];

    const totalQuestions =
        dbQuestions.length || questions.length;

    const progress =
        totalQuestions > 0
            ? ((currentIndex + 1) / totalQuestions) * 100
            : 0;

    /* ============================================================
       CREATE REAL QUIZ IN BACKEND
    ============================================================ */

    useEffect(() => {
        let cancelled = false;

        async function setupQuiz() {
            setLoading(true);
            setError("");

            try {
                if (!questions.length) {
                    throw new Error(
                        "No quiz questions were provided."
                    );
                }

                const userId = getStoredUserId();

                if (!userId) {
                    throw new Error(
                        "Please sign in before starting a quiz."
                    );
                }

                const payload = {
                    user_id: Number(userId),

                    title: "EduGap Assessment",

                    source_title:
                        typeof window !== "undefined"
                            ? sessionStorage.getItem(
                                "edugap_source_title"
                            ) || "Learning Material"
                            : "Learning Material",

                    questions: questions.map(
                        (question, index) => ({
                            question:
                                question.question ||
                                question.text ||
                                "",

                            options:
                                question.options || [],

                            answer:
                                question.answer ||
                                question.correctAnswer ||
                                question.correct_answer ||
                                "",

                            concept:
                                question.concept ||
                                question.topic ||
                                question.category ||
                                `Concept ${index + 1}`,

                            explanation:
                                question.explanation || "",
                        })
                    ),
                };

                const result = await createQuiz(payload);

                if (cancelled) return;

                if (!result?.quiz_id) {
                    throw new Error(
                        "The backend did not return a quiz ID."
                    );
                }

                setQuizId(result.quiz_id);

                if (Array.isArray(result.questions)) {
                    setDbQuestions(result.questions);
                } else {
                    setDbQuestions(questions);
                }
            } catch (err) {
                if (cancelled) return;

                console.error(
                    "Could not create quiz:",
                    err
                );

                setError(
                    err?.message ||
                    "Could not create the quiz."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        setupQuiz();

        return () => {
            cancelled = true;
        };
    }, [questions]);

    /* ============================================================
       NORMALIZE CURRENT OPTIONS
    ============================================================ */

    const options = useMemo(() => {
        if (!currentQuestion) {
            return [];
        }

        if (Array.isArray(currentQuestion.options)) {
            return currentQuestion.options;
        }

        return [];
    }, [currentQuestion]);

    /* ============================================================
       SELECT ANSWER
    ============================================================ */

    function handleAnswer(option) {
        if (!currentQuestion || submitting) {
            return;
        }

        const questionId =
            currentQuestion.id ?? currentIndex;

        setAnswers((previous) => ({
            ...previous,
            [questionId]: option,
        }));
    }

    /* ============================================================
       NEXT QUESTION
    ============================================================ */

    function handleNext() {
        if (!currentQuestion) {
            return;
        }

        const questionId =
            currentQuestion.id ?? currentIndex;

        if (
            answers[questionId] === undefined ||
            answers[questionId] === null
        ) {
            setError("Please select an answer first.");
            return;
        }

        setError("");

        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(
                (previous) => previous + 1
            );
        } else {
            handleSubmitQuiz();
        }
    }

    /* ============================================================
       PREVIOUS QUESTION
    ============================================================ */

    function handlePrevious() {
        setError("");

        if (currentIndex > 0) {
            setCurrentIndex(
                (previous) => previous - 1
            );
        }
    }

    /* ============================================================
       SUBMIT QUIZ
    ============================================================ */

    async function handleSubmitQuiz() {
        if (submitting) {
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const userId = getStoredUserId();

            if (!userId) {
                throw new Error(
                    "Your session has expired. Please sign in again."
                );
            }

            if (!quizId) {
                throw new Error(
                    "Quiz is not connected to the backend yet."
                );
            }

            const backendQuestions =
                dbQuestions.length
                    ? dbQuestions
                    : questions;

            const formattedAnswers =
                backendQuestions.map(
                    (question, index) => {
                        const questionId =
                            question.id ?? index;

                        return {
                            question_id:
                                Number(questionId),

                            selected_answer:
                                answers[questionId] ??
                                "",
                        };
                    }
                );

            const result = await submitQuiz({
                quiz_id: Number(quizId),

                user_id: Number(userId),

                answers: formattedAnswers,
            });

            /*
             * The backend is now the source of truth
             * for XP, coins, streak and badges.
             */

            const finalResult = {
                ...result,

                quizId: Number(quizId),

                userId: Number(userId),

                answers: formattedAnswers,

                questions: backendQuestions,
            };

            try {
                sessionStorage.setItem(
                    "edugap_quiz_result",
                    JSON.stringify(finalResult)
                );
            } catch (storageError) {
                console.warn(
                    "Could not save quiz result locally:",
                    storageError
                );
            }

            if (onComplete) {
                onComplete(finalResult);
            } else {
                router.push("/gap");
            }
        } catch (err) {
            console.error(
                "Could not submit quiz:",
                err
            );

            setError(
                err?.message ||
                "Could not submit the quiz."
            );
        } finally {
            setSubmitting(false);
        }
    }

    /* ============================================================
       LOADING
    ============================================================ */

    if (loading) {
        return (
            <section className="mx-auto max-w-3xl px-5 py-16">
                <div className="rounded-3xl border border-[#dedbd3] bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#dfe9df] border-t-[#344139]" />

                    <h2 className="mt-6 text-xl font-bold text-[#171717]">
                        Preparing your assessment
                    </h2>

                    <p className="mt-2 text-sm text-[#7d899b]">
                        Connecting your quiz to your
                        learning profile...
                    </p>
                </div>
            </section>
        );
    }

    /* ============================================================
       ERROR
    ============================================================ */

    if (error && !currentQuestion) {
        return (
            <section className="mx-auto max-w-3xl px-5 py-16">
                <div className="rounded-3xl border border-red-200 bg-white p-8 text-center">
                    <div className="text-3xl">!</div>

                    <h2 className="mt-4 text-xl font-bold text-[#171717]">
                        Quiz setup failed
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-[#7d899b]">
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.push("/login")
                        }
                        className="mt-6 rounded-full bg-[#344139] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4b5c50]"
                    >
                        Sign in
                    </button>
                </div>
            </section>
        );
    }

    /* ============================================================
       NO QUESTIONS
    ============================================================ */

    if (!currentQuestion || !totalQuestions) {
        return (
            <section className="mx-auto max-w-3xl px-5 py-16">
                <div className="rounded-3xl border border-[#dedbd3] bg-white p-8 text-center">
                    <h2 className="text-xl font-bold text-[#171717]">
                        No questions available
                    </h2>

                    <p className="mt-2 text-sm text-[#7d899b]">
                        Please return to your learning
                        material and generate an assessment.
                    </p>
                </div>
            </section>
        );
    }

    const questionId =
        currentQuestion.id ?? currentIndex;

    const selectedAnswer =
        answers[questionId];

    /* ============================================================
       MAIN UI
    ============================================================ */

    return (
        <section className="mx-auto max-w-4xl px-5 py-8 md:py-12">

            {/* HEADER */}

            <div className="mb-8">

                <div className="flex items-center justify-between gap-4">

                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b98ad]">
                            EduGap Assessment
                        </p>

                        <h1 className="mt-2 text-2xl font-black tracking-tight text-[#171717] md:text-3xl">
                            Test your understanding
                        </h1>
                    </div>

                    <div className="shrink-0 rounded-full bg-[#e9eee8] px-4 py-2 text-sm font-bold text-[#344139]">
                        {currentIndex + 1} /{" "}
                        {totalQuestions}
                    </div>

                </div>

                {/* PROGRESS */}

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e7e4dc]">

                    <div
                        className="h-full rounded-full bg-[#344139] transition-all duration-300"
                        style={{
                            width: `${progress}%`,
                        }}
                    />

                </div>

            </div>

            {/* QUESTION */}

            <div className="rounded-3xl border border-[#dedbd3] bg-white shadow-sm">

                <div className="border-b border-[#e9e6df] px-6 py-6 md:px-8">

                    <div className="flex flex-wrap items-center gap-2">

                        <span className="rounded-full bg-[#f0f3ef] px-3 py-1 text-xs font-semibold text-[#526257]">
                            Question {currentIndex + 1}
                        </span>

                        {currentQuestion.concept && (
                            <span className="rounded-full bg-[#f5f3ed] px-3 py-1 text-xs font-semibold text-[#8794a8]">
                                {currentQuestion.concept}
                            </span>
                        )}

                    </div>

                    <h2 className="mt-5 text-xl font-bold leading-8 text-[#171717] md:text-2xl">
                        {currentQuestion.question ||
                            currentQuestion.text}
                    </h2>

                </div>

                {/* OPTIONS */}

                <div className="space-y-3 px-6 py-6 md:px-8">

                    {options.map((option, index) => {

                        const optionValue =
                            typeof option === "object"
                                ? option.value ??
                                option.text ??
                                option.label ??
                                ""
                                : option;

                        const optionLabel =
                            typeof option === "object"
                                ? option.label ??
                                option.text ??
                                option.value ??
                                ""
                                : option;

                        const selected =
                            String(
                                selectedAnswer ?? ""
                            ) ===
                            String(optionValue);

                        return (
                            <button
                                key={`${questionId}-${index}`}
                                type="button"
                                onClick={() =>
                                    handleAnswer(
                                        optionValue
                                    )
                                }
                                disabled={submitting}
                                className={`
                                    flex w-full items-center gap-4
                                    rounded-2xl border
                                    p-4 text-left
                                    transition duration-200
                                    ${selected
                                        ? "border-[#344139] bg-[#e9eee8]"
                                        : "border-[#e3e0d8] bg-white hover:border-[#b9c2b8] hover:bg-[#f8f8f5]"
                                    }
                                `}
                            >

                                <span
                                    className={`
                                        flex h-9 w-9 shrink-0
                                        items-center justify-center
                                        rounded-full
                                        text-sm font-bold
                                        ${selected
                                            ? "bg-[#344139] text-white"
                                            : "bg-[#f0eee8] text-[#66758d]"
                                        }
                                    `}
                                >
                                    {String.fromCharCode(
                                        65 + index
                                    )}
                                </span>

                                <span className="text-sm font-medium leading-6 text-[#344139]">
                                    {optionLabel}
                                </span>

                            </button>
                        );
                    })}

                </div>

                {/* ERROR */}

                {error && (
                    <div className="mx-6 mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 md:mx-8">
                        {error}
                    </div>
                )}

                {/* CONTROLS */}

                <div className="flex flex-col-reverse gap-3 border-t border-[#e9e6df] px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">

                    <button
                        type="button"
                        onClick={handlePrevious}
                        disabled={
                            currentIndex === 0 ||
                            submitting
                        }
                        className="
                            rounded-full
                            border border-[#d5d2ca]
                            px-5 py-3
                            text-sm font-semibold
                            text-[#526257]
                            transition
                            hover:bg-[#f5f3ed]
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                        "
                    >
                        ← Previous
                    </button>

                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={submitting}
                        className="
                            rounded-full
                            bg-[#344139]
                            px-6 py-3
                            text-sm font-semibold
                            text-white
                            transition
                            hover:bg-[#4b5c50]
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        {submitting
                            ? "Submitting..."
                            : currentIndex ===
                                totalQuestions - 1
                                ? "Finish assessment"
                                : "Next question →"}
                    </button>

                </div>

            </div>

            {/* BACKEND NOTE */}

            <div className="mt-5 text-center text-xs text-[#9aa3b1]">
                Your result is saved to your EduGap learning
                profile.
            </div>

        </section>
    );
}
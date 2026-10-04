"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    API_URL,
    submitRetry,
    getStoredUserId,
} from "../../lib/api";

export default function RetryPage() {
    const router = useRouter();

    const [concept, setConcept] =
        useState(null);

    const [sourceText, setSourceText] =
        useState("");

    const [questions, setQuestions] =
        useState([]);

    const [retryQuestion, setRetryQuestion] =
        useState(null);

    const [selected, setSelected] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    useEffect(() => {
        try {
            const storedConcept =
                sessionStorage.getItem(
                    "edugap_gap_concept"
                );

            const storedSource =
                sessionStorage.getItem(
                    "edugap_source_text"
                );

            const storedQuestions =
                sessionStorage.getItem(
                    "edugap_questions"
                );

            if (storedConcept) {
                setConcept(
                    JSON.parse(
                        storedConcept
                    )
                );
            }

            if (storedSource) {
                setSourceText(
                    storedSource
                );
            }

            if (storedQuestions) {
                setQuestions(
                    JSON.parse(
                        storedQuestions
                    )
                );
            }
        } catch (error) {
            console.error(
                "Could not load retry data:",
                error
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (
            loading ||
            !concept ||
            !sourceText
        ) {
            return;
        }

        generateRetryQuestion();
    }, [
        loading,
        concept,
        sourceText,
    ]);

    const generateRetryQuestion =
        async () => {
            setSubmitting(true);
            setError("");

            try {
                const response =
                    await fetch(
                        `${API_URL}/generate-retry`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body: JSON.stringify({
                                source_text:
                                    sourceText,

                                concept,

                                previous_questions:
                                    questions,
                            }),
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    const message =
                        typeof data?.detail ===
                            "string"
                            ? data.detail
                            : JSON.stringify(
                                data?.detail ||
                                data
                            );

                    throw new Error(
                        message
                    );
                }

                setRetryQuestion(
                    data
                );
            } catch (error) {
                console.error(
                    "Retry generation failed:",
                    error
                );

                setError(
                    error?.message ||
                    "Could not generate the retry question."
                );
            } finally {
                setSubmitting(false);
            }
        };


    const submitAnswer = async () => {
        if (
            !retryQuestion ||
            selected === null ||
            submitting
        ) {
            return;
        }

        const userId =
            getStoredUserId();

        if (!userId) {
            setError(
                "Please sign in before submitting the retry challenge."
            );

            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const result =
                await submitRetry({
                    user_id: Number(userId),

                    selected_answer:
                        selected,

                    correct_answer:
                        retryQuestion.answer,

                    question:
                        retryQuestion.question,

                    concept:
                        retryQuestion.concept ||
                        concept?.name ||
                        "",

                    explanation:
                        retryQuestion.explanation ||
                        "",
                });

            /*
             * Keep the retry result in sessionStorage
             * only for the Rewards page to display.
             *
             * XP, coins, streak and badges are NOT
             * calculated here.
             *
             * The backend has already persisted them.
             */

            sessionStorage.setItem(
                "edugap_retry_result",
                JSON.stringify(result)
            );

            router.push(
                "/rewards"
            );
        } catch (error) {
            console.error(
                "Retry submission failed:",
                error
            );

            setError(
                error?.message ||
                "Could not submit the retry challenge."
            );

            setSubmitting(false);
        }
    };


    if (loading) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        Preparing your retry challenge...
                    </div>
                </div>
            </main>
        );
    }


    if (!concept || !sourceText) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="text-3xl font-black">
                            Your recovery session is missing.
                        </div>

                        <p className="mt-4 text-[#8794a8]">
                            Start the learning journey again
                            so EduGap can build a fresh retry.
                        </p>

                        <button
                            onClick={() =>
                                router.push(
                                    "/upload"
                                )
                            }
                            className="mt-7 rounded-full bg-[#171717] px-8 py-4 font-semibold text-white"
                        >
                            Start again →
                        </button>
                    </div>
                </div>
            </main>
        );
    }


    return (
        <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-12 md:py-16">
            <div className="mx-auto max-w-4xl">

                <div className="mb-10">

                    <div className="text-xs font-semibold tracking-[0.3em] text-[#91a0b7]">
                        STEP 06 · RETRY
                    </div>

                    <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                        Did the gap close?
                    </h1>

                    <p className="mt-4 max-w-2xl text-lg leading-8 text-[#68778c]">
                        This is a fresh question generated around
                        your weak concept.
                    </p>

                </div>


                <div className="mb-6 rounded-[28px] bg-[#e8eee8] p-6">

                    <div className="text-xs font-semibold tracking-[0.25em] text-[#718277]">
                        FOCUS CONCEPT
                    </div>

                    <div className="mt-3 text-2xl font-black">
                        {concept.name}
                    </div>

                </div>


                {error && (
                    <div className="rounded-[28px] bg-[#fff0ee] p-6 text-[#b44b42]">

                        <div className="font-bold">
                            Could not create retry
                            challenge
                        </div>

                        <p className="mt-2 text-sm">
                            {error}
                        </p>

                        <button
                            onClick={
                                generateRetryQuestion
                            }
                            className="mt-5 rounded-full bg-[#171717] px-6 py-3 text-sm font-semibold text-white"
                        >
                            Try again
                        </button>

                    </div>
                )}


                {submitting && (
                    <div className="rounded-[36px] bg-white p-12 text-center">

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#d7d4cc]">

                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d7d4cc] border-t-[#171717]" />

                        </div>

                        <div className="mt-6 text-xl font-bold">
                            Creating your retry challenge...
                        </div>

                        <p className="mt-2 text-[#8794a8]">
                            Groq is creating a new question
                            around your learning gap.
                        </p>

                    </div>
                )}


                {!submitting &&
                    retryQuestion && (
                        <div className="rounded-[38px] bg-white p-8 md:p-10">

                            <div className="text-xs font-semibold tracking-[0.25em] text-[#91a0b7]">
                                RETRY QUESTION
                            </div>

                            <h2 className="mt-6 text-2xl font-black leading-9 md:text-3xl">
                                {
                                    retryQuestion.question
                                }
                            </h2>


                            <div className="mt-9 space-y-4">

                                {retryQuestion.options?.map(
                                    (
                                        option,
                                        index
                                    ) => {

                                        const active =
                                            selected ===
                                            option;

                                        return (
                                            <button
                                                key={
                                                    index
                                                }
                                                onClick={() =>
                                                    setSelected(
                                                        option
                                                    )
                                                }
                                                className={`flex w-full items-center gap-4 rounded-[22px] border p-5 text-left transition ${active
                                                    ? "border-[#171717] bg-[#171717] text-white"
                                                    : "border-[#dedbd3] bg-[#faf9f6] hover:border-[#9ca6b5]"
                                                    }`}
                                            >

                                                <span
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active
                                                        ? "bg-white text-[#171717]"
                                                        : "bg-[#e9e7e1] text-[#59677a]"
                                                        }`}
                                                >
                                                    {String.fromCharCode(
                                                        65 +
                                                        index
                                                    )}
                                                </span>

                                                <span className="font-medium">
                                                    {
                                                        option
                                                    }
                                                </span>

                                            </button>
                                        );
                                    }
                                )}

                            </div>


                            <button
                                onClick={
                                    submitAnswer
                                }
                                disabled={
                                    selected ===
                                    null ||
                                    submitting
                                }
                                className="mt-9 w-full rounded-full bg-[#171717] py-5 font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Check my improvement →
                            </button>

                        </div>
                    )}

            </div>
        </main>
    );
}
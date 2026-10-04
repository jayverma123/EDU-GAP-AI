"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Quiz from "../../components/Quiz";

export default function QuizPage() {
    const router = useRouter();

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const stored =
                sessionStorage.getItem(
                    "edugap_questions"
                );

            if (stored) {
                setQuestions(
                    JSON.parse(stored)
                );
            }
        } catch (error) {
            console.error(
                "Could not load quiz:",
                error
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const handleComplete = (result) => {
        /*
         * Save the complete diagnostic result.
         */
        sessionStorage.setItem(
            "edugap_quiz_result",
            JSON.stringify(result)
        );

        /*
         * Find the weakest concept.
         *
         * Lower accuracy = higher priority.
         */
        const conceptStats =
            result.conceptStats || {};

        let weakestConcept = null;
        let weakestPercentage = Infinity;

        Object.entries(
            conceptStats
        ).forEach(
            ([conceptName, stats]) => {
                if (!stats?.total) {
                    return;
                }

                const percentage =
                    (stats.correct /
                        stats.total) *
                    100;

                if (
                    percentage <
                    weakestPercentage
                ) {
                    weakestPercentage =
                        percentage;

                    weakestConcept =
                        conceptName;
                }
            }
        );

        /*
         * Find the complete concept object
         * from the generated knowledge graph.
         */
        try {
            const storedConcepts =
                sessionStorage.getItem(
                    "edugap_concepts"
                );

            const concepts =
                storedConcepts
                    ? JSON.parse(
                        storedConcepts
                    )
                    : [];

            let gapConcept =
                concepts.find(
                    (concept) =>
                        concept.name ===
                        weakestConcept
                );

            /*
             * Fallback if a concept was not
             * returned exactly by the AI.
             */
            if (!gapConcept) {
                gapConcept = {
                    name:
                        weakestConcept ||
                        "Learning Gap",
                    description:
                        "This concept needs additional practice.",
                    prerequisites: [],
                };
            }

            sessionStorage.setItem(
                "edugap_gap_concept",
                JSON.stringify(
                    gapConcept
                )
            );

            sessionStorage.setItem(
                "edugap_learning_concept",
                JSON.stringify(
                    gapConcept
                )
            );
        } catch (error) {
            console.error(
                "Could not save gap concept:",
                error
            );
        }

        router.push("/gap");
    };

    if (loading) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#d7d4cc]">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d7d4cc] border-t-[#171717]" />
                        </div>

                        <div className="mt-6 text-xl font-bold">
                            Preparing your diagnostic quiz...
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (!questions.length) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="text-3xl font-black">
                            No quiz is ready yet.
                        </div>

                        <p className="mx-auto mt-4 max-w-xl leading-7 text-[#8794a8]">
                            Upload your learning material first
                            so EduGap can generate a diagnostic
                            quiz.
                        </p>

                        <button
                            onClick={() =>
                                router.push(
                                    "/upload"
                                )
                            }
                            className="mt-8 rounded-full bg-[#171717] px-8 py-4 font-semibold text-white"
                        >
                            Upload material →
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-12 md:py-16">
            <div className="mx-auto max-w-5xl">
                <div className="mb-10">
                    <div className="text-xs font-semibold tracking-[0.3em] text-[#91a0b7]">
                        STEP 03 · DIAGNOSE
                    </div>

                    <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                        Let's see what
                        you actually know.
                    </h1>

                    <p className="mt-4 max-w-2xl text-lg leading-8 text-[#68778c]">
                        This isn't about getting a perfect score.
                        EduGap is looking for the concept behind
                        your mistakes.
                    </p>
                </div>

                <Quiz
                    questions={questions}
                    onComplete={
                        handleComplete
                    }
                />
            </div>
        </main>
    );
}
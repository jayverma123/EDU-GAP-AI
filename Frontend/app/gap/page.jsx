"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GapPage() {
    const router = useRouter();

    const [result, setResult] = useState(null);
    const [concept, setConcept] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedResult =
                sessionStorage.getItem("edugap_quiz_result");

            const storedConcept =
                sessionStorage.getItem("edugap_gap_concept");

            if (storedResult) {
                setResult(JSON.parse(storedResult));
            }

            if (storedConcept) {
                setConcept(JSON.parse(storedConcept));
            }
        } catch (error) {
            console.error("Could not load gap:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const startLearning = () => {
        if (concept) {
            sessionStorage.setItem(
                "edugap_learning_concept",
                JSON.stringify(concept)
            );
        }

        router.push("/learning");
    };

    if (loading) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="text-lg font-semibold text-[#68778c]">
                            Loading your learning diagnosis...
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (!result || !concept) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="text-3xl font-black">
                            No learning gap found yet.
                        </div>

                        <p className="mt-4 text-[#8794a8]">
                            Complete the diagnostic quiz first.
                        </p>

                        <button
                            onClick={() => router.push("/quiz")}
                            className="mt-7 rounded-full bg-[#171717] px-8 py-4 font-semibold text-white transition hover:bg-[#344139]"
                        >
                            Take diagnostic quiz →
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    /*
     * The backend quiz result is the source of truth.
     *
     * We still safely support missing values because the UI
     * should never crash if an older result exists in sessionStorage.
     */

    const percentage = Number(result.percentage ?? 0);
    const correct = Number(result.correct ?? 0);
    const total = Number(result.total ?? 0);

    const conceptStats =
        result.conceptStats?.[concept.name] || null;

    const conceptCorrect = Number(
        conceptStats?.correct ?? 0
    );

    const conceptTotal = Number(
        conceptStats?.total ?? 0
    );

    const conceptPercentage =
        conceptTotal > 0
            ? Math.round(
                (conceptCorrect / conceptTotal) * 100
            )
            : 0;

    const prerequisites = Array.isArray(
        concept.prerequisites
    )
        ? concept.prerequisites
        : [];

    return (
        <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-12 md:py-16">
            <div className="mx-auto max-w-5xl">

                {/* INTRO */}
                <div className="mb-10">
                    <div className="text-xs font-semibold tracking-[0.3em] text-[#91a0b7]">
                        STEP 04 · FIND THE GAP
                    </div>

                    <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                        Your score is only
                        the beginning.
                    </h1>

                    <p className="mt-4 max-w-2xl text-lg leading-8 text-[#68778c]">
                        EduGap looked beyond the total score to
                        identify the concept that needs your
                        attention first.
                    </p>
                </div>

                {/* METRICS */}
                <div className="grid gap-5 md:grid-cols-3">
                    <Metric
                        label="QUIZ SCORE"
                        value={`${percentage}%`}
                    />

                    <Metric
                        label="CORRECT"
                        value={`${correct}/${total}`}
                    />

                    <Metric
                        label="GAP MASTERY"
                        value={`${conceptPercentage}%`}
                    />
                </div>

                {/* ROOT CAUSE GAP */}
                <div className="mt-6 rounded-[38px] bg-[#1b201d] p-8 text-white md:p-12">
                    <div className="text-xs font-semibold tracking-[0.3em] text-[#89978f]">
                        ROOT-CAUSE GAP
                    </div>

                    <h2 className="mt-5 text-4xl font-black md:text-5xl">
                        {concept.name}
                    </h2>

                    <p className="mt-5 max-w-3xl text-lg leading-8 text-[#b1bab5]">
                        {concept.description ||
                            "This concept needs additional practice."}
                    </p>

                    <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f4e8b6] text-[#171717]">
                            !
                        </span>

                        Weakest demonstrated concept
                    </div>
                </div>

                {/* WHY THIS GAP */}
                <div className="mt-6 rounded-[32px] border border-[#dedbd3] bg-white p-7 md:p-8">
                    <div className="text-xs font-semibold tracking-[0.25em] text-[#91a0b7]">
                        WHY THIS GAP?
                    </div>

                    <h3 className="mt-4 text-2xl font-black">
                        We didn't stop at your total score.
                    </h3>

                    <p className="mt-4 max-w-3xl leading-7 text-[#68778c]">
                        EduGap grouped your quiz answers by concept.
                        The concept with the weakest demonstrated
                        performance becomes your first recovery
                        target.
                    </p>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <Reason
                            number="01"
                            title="Quiz"
                            text="Your answers provide the evidence."
                        />

                        <Reason
                            number="02"
                            title="Concept"
                            text="Answers are mapped to knowledge concepts."
                        />

                        <Reason
                            number="03"
                            title="Gap"
                            text="The weakest concept becomes the recovery target."
                        />
                    </div>
                </div>

                {/* PREREQUISITES */}
                {prerequisites.length > 0 && (
                    <div className="mt-6 rounded-[30px] bg-[#e8eee8] p-7">
                        <div className="text-xs font-semibold tracking-[0.25em] text-[#718277]">
                            PREREQUISITES
                        </div>

                        <p className="mt-3 text-sm leading-6 text-[#68778c]">
                            These concepts support your recovery path.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                            {prerequisites.map(
                                (prerequisite, index) => (
                                    <span
                                        key={`${prerequisite}-${index}`}
                                        className="rounded-full bg-white px-5 py-3 text-sm font-semibold"
                                    >
                                        {prerequisite}
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                )}

                {/* RECOVERY CTA */}
                <button
                    onClick={startLearning}
                    className="mt-8 w-full rounded-full bg-[#171717] py-5 text-lg font-bold text-white transition hover:scale-[1.01] hover:bg-[#344139]"
                >
                    Build my recovery path →
                </button>

                <p className="mt-4 text-center text-sm text-[#91a0b7]">
                    EduGap will use this concept as the starting point
                    for your recovery journey.
                </p>
            </div>
        </main>
    );
}

function Metric({ label, value }) {
    return (
        <div className="rounded-[28px] bg-white p-7">
            <div className="text-xs font-semibold tracking-[0.25em] text-[#91a0b7]">
                {label}
            </div>

            <div className="mt-3 text-4xl font-black">
                {value}
            </div>
        </div>
    );
}

function Reason({ number, title, text }) {
    return (
        <div className="rounded-[24px] bg-[#f7f6f2] p-5">
            <div className="text-xs font-bold tracking-[0.2em] text-[#a0aaba]">
                {number}
            </div>

            <div className="mt-3 font-black">
                {title}
            </div>

            <p className="mt-2 text-sm leading-6 text-[#78869a]">
                {text}
            </p>
        </div>
    );
}
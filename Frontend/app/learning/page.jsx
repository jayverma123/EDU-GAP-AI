"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LearningPage() {
    const router = useRouter();

    const [concept, setConcept] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const stored =
                sessionStorage.getItem(
                    "edugap_learning_concept"
                );

            if (stored) {
                setConcept(JSON.parse(stored));
            }
        } catch (error) {
            console.error(
                "Could not load learning concept:",
                error
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const startRetry = () => {
        if (!concept) return;

        /*
         * Keep the diagnosed concept available for the retry
         * page. The retry system can use this concept to select
         * the appropriate recovery questions.
         */
        sessionStorage.setItem(
            "edugap_retry_concept",
            JSON.stringify(concept)
        );

        router.push("/retry");
    };

    if (loading) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        Preparing your recovery lesson...
                    </div>
                </div>
            </main>
        );
    }

    if (!concept) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="text-3xl font-black">
                            No recovery concept selected.
                        </div>

                        <p className="mt-4 text-[#8794a8]">
                            Complete the diagnostic journey first.
                        </p>

                        <button
                            onClick={() =>
                                router.push("/quiz")
                            }
                            className="mt-7 rounded-full bg-[#171717] px-8 py-4 font-semibold text-white transition hover:bg-[#344139]"
                        >
                            Go to quiz →
                        </button>
                    </div>
                </div>
            </main>
        );
    }

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
                        STEP 05 · RECOVER
                    </div>

                    <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                        Let's close this gap.
                    </h1>

                    <p className="mt-4 max-w-2xl text-lg leading-8 text-[#68778c]">
                        You don't need to relearn everything.
                        EduGap is narrowing your next step to one
                        concept.
                    </p>
                </div>

                {/* FOCUS CONCEPT */}

                <div className="rounded-[40px] bg-[#1b201d] p-8 text-white md:p-12">
                    <div className="text-xs font-semibold tracking-[0.3em] text-[#89978f]">
                        YOUR FOCUS
                    </div>

                    <h2 className="mt-5 text-4xl font-black md:text-5xl">
                        {concept.name}
                    </h2>

                    <p className="mt-5 max-w-3xl text-lg leading-8 text-[#b1bab5]">
                        {concept.description ||
                            `Review the core ideas behind ${concept.name} before attempting the retry challenge.`}
                    </p>
                </div>

                {/* UNDERSTAND + RECOVERY */}

                <div className="mt-6 grid gap-5 md:grid-cols-2">

                    <div className="rounded-[32px] bg-white p-8">
                        <div className="text-xs font-semibold tracking-[0.25em] text-[#91a0b7]">
                            UNDERSTAND
                        </div>

                        <h3 className="mt-4 text-2xl font-black">
                            Rebuild the foundation
                        </h3>

                        <p className="mt-4 leading-7 text-[#68778c]">
                            Focus on what this concept means,
                            how it works, and how it connects to
                            the surrounding knowledge.
                        </p>

                        {prerequisites.length > 0 && (
                            <div className="mt-6">
                                <div className="text-sm font-bold">
                                    Review first:
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {prerequisites.map(
                                        (
                                            prerequisite,
                                            index
                                        ) => (
                                            <span
                                                key={`${prerequisite}-${index}`}
                                                className="rounded-full bg-[#f1efe9] px-4 py-2 text-sm font-semibold"
                                            >
                                                {prerequisite}
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-[32px] bg-[#e8eee8] p-8">
                        <div className="text-xs font-semibold tracking-[0.25em] text-[#718277]">
                            RECOVERY PATH
                        </div>

                        <h3 className="mt-4 text-2xl font-black">
                            Learn → Practice → Retry
                        </h3>

                        <div className="mt-6 space-y-4">
                            <PathStep
                                number="1"
                                title="Understand"
                                text="Review the concept and its prerequisites."
                            />

                            <PathStep
                                number="2"
                                title="Practice"
                                text="Connect the idea to the knowledge around it."
                            />

                            <PathStep
                                number="3"
                                title="Retry"
                                text="Prove that the gap has actually closed."
                            />
                        </div>
                    </div>
                </div>

                {/* READY */}

                <div className="mt-8 rounded-[32px] border border-[#dedbd3] bg-white p-7 text-center md:p-9">
                    <div className="text-xs font-semibold tracking-[0.25em] text-[#91a0b7]">
                        READY?
                    </div>

                    <h2 className="mt-3 text-2xl font-black">
                        Let's test the improvement.
                    </h2>

                    <p className="mt-3 text-[#8794a8]">
                        Your retry will stay focused on this
                        diagnosed concept.
                    </p>

                    <button
                        onClick={startRetry}
                        className="mt-7 rounded-full bg-[#171717] px-9 py-4 font-bold text-white transition hover:scale-[1.02] hover:bg-[#344139]"
                    >
                        Take the retry challenge →
                    </button>
                </div>
            </div>
        </main>
    );
}

function PathStep({
    number,
    title,
    text,
}) {
    return (
        <div className="flex gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black">
                {number}
            </div>

            <div>
                <div className="font-black">
                    {title}
                </div>

                <p className="mt-1 text-sm leading-6 text-[#617266]">
                    {text}
                </p>
            </div>
        </div>
    );
}
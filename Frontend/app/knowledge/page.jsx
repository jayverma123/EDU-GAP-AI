"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import KnowledgeGraph from "../../components/KnowledgeGraph";

export default function KnowledgePage() {
    const router = useRouter();

    const [analysis, setAnalysis] =
        useState(null);

    const [selectedConcept, setSelectedConcept] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {
        try {
            const stored =
                sessionStorage.getItem(
                    "edugap_analysis"
                );

            if (!stored) {
                setLoading(false);
                return;
            }

            const parsed =
                JSON.parse(stored);

            setAnalysis(parsed);
        } catch (error) {
            console.error(
                "Could not load analysis:",
                error
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const startQuiz = () => {
        router.push(
            "/quiz"
        );
    };

    if (loading) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-6xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#d7d4cc]">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d7d4cc] border-t-[#171717]" />
                        </div>

                        <div className="mt-6 text-xl font-bold">
                            Loading your knowledge map...
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (!analysis) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="text-3xl font-black">
                            Your learning map is empty.
                        </div>

                        <p className="mx-auto mt-4 max-w-xl leading-7 text-[#8794a8]">
                            Upload your learning material first.
                            EduGap will build the map automatically.
                        </p>

                        <button
                            onClick={() =>
                                router.push(
                                    "/upload"
                                )
                            }
                            className="mt-8 rounded-full bg-[#171717] px-8 py-4 font-semibold text-white"
                        >
                            Upload learning material →
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const concepts =
        analysis.concepts || [];

    const questions =
        analysis.questions || [];

    const graph =
        analysis.graph || null;

    return (
        <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-10 md:py-14">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="text-xs font-semibold tracking-[0.3em] text-[#91a0b7]">
                            STEP 02 · UNDERSTAND
                        </div>

                        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                            Your knowledge map
                        </h1>

                        <p className="mt-3 max-w-2xl leading-7 text-[#68778c]">
                            EduGap found the concepts inside your
                            learning material and connected them
                            through prerequisites.
                        </p>
                    </div>

                    <div className="flex shrink-0 gap-3">
                        <Stat
                            value={concepts.length}
                            label="concepts"
                        />

                        <Stat
                            value={questions.length}
                            label="quiz questions"
                        />
                    </div>
                </div>

                <div className="mb-6 rounded-[30px] border border-[#dedbd3] bg-white p-6 md:p-7">
                    <div className="text-xs font-semibold tracking-[0.25em] text-[#91a0b7]">
                        MATERIAL
                    </div>

                    <div className="mt-3 text-xl font-black">
                        {analysis.title ||
                            "Learning Material"}
                    </div>

                    <p className="mt-3 max-w-4xl leading-7 text-[#68778c]">
                        {analysis.summary ||
                            "EduGap analyzed your material and built a personalized learning structure."}
                    </p>
                </div>

                <KnowledgeGraph
                    concepts={concepts}
                    graph={graph}
                    onSelect={
                        setSelectedConcept
                    }
                />

                {selectedConcept && (
                    <div className="mt-6 rounded-[30px] bg-[#e8eee8] p-7">
                        <div className="text-xs font-semibold tracking-[0.25em] text-[#718277]">
                            CONCEPT SELECTED
                        </div>

                        <div className="mt-3 text-2xl font-black">
                            {selectedConcept.name}
                        </div>

                        <p className="mt-3 max-w-3xl leading-7 text-[#617266]">
                            {selectedConcept.description ||
                                "This concept is part of your learning path."}
                        </p>
                    </div>
                )}

                <div className="mt-8 rounded-[36px] bg-[#171717] p-8 text-white md:p-10">
                    <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <div className="text-xs font-semibold tracking-[0.3em] text-[#9ca7a1]">
                                NEXT · DIAGNOSE
                            </div>

                            <h2 className="mt-4 text-3xl font-black md:text-4xl">
                                Now let's find where
                                you need help.
                            </h2>

                            <p className="mt-4 max-w-2xl leading-7 text-[#adb6b1]">
                                Your knowledge map shows what connects
                                to what. The diagnostic quiz shows
                                which parts you actually understand.
                            </p>
                        </div>

                        <button
                            onClick={
                                startQuiz
                            }
                            className="rounded-full bg-white px-8 py-5 font-bold text-[#171717] transition hover:scale-[1.02]"
                        >
                            Start diagnostic quiz →
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}

function Stat({
    value,
    label,
}) {
    return (
        <div className="rounded-[22px] border border-[#dedbd3] bg-white px-5 py-4 text-center">
            <div className="text-2xl font-black">
                {value}
            </div>

            <div className="mt-1 text-xs text-[#8794a8]">
                {label}
            </div>
        </div>
    );
}
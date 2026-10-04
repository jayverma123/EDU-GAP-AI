"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
    const [signedIn, setSignedIn] =
        useState(false);

    const [user, setUser] =
        useState(null);

    const [mounted, setMounted] =
        useState(false);

    const [analysis, setAnalysis] =
        useState(null);

    const [quizResult, setQuizResult] =
        useState(null);

    const loadData = () => {
        // -----------------------------
        // USER
        // -----------------------------
        const storedUser =
            sessionStorage.getItem(
                "edugap_user"
            );

        if (storedUser) {
            try {
                const parsed =
                    JSON.parse(
                        storedUser
                    );

                setUser(parsed);
                setSignedIn(true);
            } catch {
                setUser(null);
                setSignedIn(false);
            }
        } else {
            setUser(null);
            setSignedIn(false);
        }

        // -----------------------------
        // ANALYSIS
        // -----------------------------
        const storedAnalysis =
            sessionStorage.getItem(
                "edugap_analysis"
            );

        if (storedAnalysis) {
            try {
                setAnalysis(
                    JSON.parse(
                        storedAnalysis
                    )
                );
            } catch {
                setAnalysis(null);
            }
        } else {
            setAnalysis(null);
        }

        // -----------------------------
        // QUIZ RESULT
        // -----------------------------
        const storedQuizResult =
            sessionStorage.getItem(
                "edugap_quiz_result"
            );

        if (storedQuizResult) {
            try {
                setQuizResult(
                    JSON.parse(
                        storedQuizResult
                    )
                );
            } catch {
                setQuizResult(null);
            }
        } else {
            setQuizResult(null);
        }
    };

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const handleFocus = () => {
            loadData();
        };

        window.addEventListener(
            "focus",
            handleFocus
        );

        return () => {
            window.removeEventListener(
                "focus",
                handleFocus
            );
        };
    }, [mounted]);

    // =========================================
    // REAL SIGN OUT
    // =========================================
    const handleSignOut = () => {
        /*
         * Remove the signed-in user's identity.
         */
        sessionStorage.removeItem(
            "edugap_user"
        );

        sessionStorage.removeItem(
            "edugap_user_id"
        );

        /*
         * Remove the current learning session.
         *
         * These values belong to the current
         * browser learning journey and should
         * never remain visible after sign out.
         */
        const learningSessionKeys = [
            "edugap_analysis",
            "edugap_source_text",
            "edugap_source_title",
            "edugap_questions",
            "edugap_concepts",
            "edugap_graph",
            "edugap_gap_concept",
            "edugap_learning_concept",
            "edugap_retry_concept",
            "edugap_retry_result",
            "edugap_quiz_result",
            "edugap_last_reward",
        ];

        learningSessionKeys.forEach(
            (key) => {
                sessionStorage.removeItem(key);
            }
        );

        /*
         * Remove old fake/local progress from
         * the earlier version of EduGap.
         */
        sessionStorage.removeItem(
            "edugap_xp"
        );

        sessionStorage.removeItem(
            "edugap_coins"
        );

        localStorage.removeItem(
            "edugap_account"
        );

        /*
         * Reset the current React state.
         */
        setSignedIn(false);
        setUser(null);
        setAnalysis(null);
        setQuizResult(null);

        /*
         * Reload the home page so every component
         * starts from a completely clean session.
         */
        window.location.replace("/");
    };

    /*
     * ------------------------------------
     * REAL LEARNING DATA
     * ------------------------------------
     */

    const concepts =
        Array.isArray(
            analysis?.concepts
        )
            ? analysis.concepts
            : [];

    const graph =
        analysis?.graph || null;

    const connections =
        getConnectionCount(
            graph,
            concepts
        );

    const conceptStats =
        quizResult?.conceptStats ||
        {};

    const conceptRows =
        concepts.slice(0, 5).map(
            (concept) => {
                const stats =
                    conceptStats[
                    concept.name
                    ];

                if (!stats || !stats.total) {
                    return {
                        name: concept.name,
                        status: "Not assessed",
                        warning: false,
                    };
                }

                const score =
                    Math.round(
                        (stats.correct /
                            stats.total) *
                        100
                    );

                if (score < 70) {
                    return {
                        name: concept.name,
                        status: "Review",
                        warning: true,
                    };
                }

                return {
                    name: concept.name,
                    status: "Strong",
                    warning: false,
                };
            }
        );

    const reviewCount =
        concepts.filter(
            (concept) => {
                const stats =
                    conceptStats[
                    concept.name
                    ];

                if (
                    !stats ||
                    !stats.total
                ) {
                    return false;
                }

                return (
                    stats.correct /
                    stats.total <
                    0.7
                );
            }
        ).length;

    const weakestConcept =
        getWeakestConcept(
            concepts,
            conceptStats
        );

    const hasMaterial =
        concepts.length > 0 ||
        Boolean(analysis);

    const studyTitle =
        analysis?.title ||
        "No study material yet";

    /*
     * ------------------------------------
     * RENDER
     * ------------------------------------
     */

    return (
        <main className="min-h-[calc(100vh-68px)] bg-[#f8fafc]">

            {/* =========================================
                HERO
            ========================================= */}

            <section className="border-b border-[#e2e8f0] bg-white">

                <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">

                    <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">

                        {/* HERO COPY */}

                        <div>

                            <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-[#dbeafe] bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#2563eb]">

                                <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />

                                PERSONALIZED LEARNING

                            </div>

                            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-[#172033] md:text-6xl">

                                Understand what you
                                know. Focus on what
                                you need next.

                            </h1>

                            <p className="mt-6 max-w-2xl text-base leading-7 text-[#64748b] md:text-lg">

                                EduGap helps you turn study
                                material into a structured
                                knowledge map, identify learning
                                gaps, and build a focused path
                                to improve.

                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                                <Link
                                    href="/register"
                                    className="rounded-lg bg-[#344139] px-6 py-3.5 text-center text-sm font-semibold !text-white transition hover:bg-[#4b5c50] hover:!text-white"
                                >
                                    Create account →
                                </Link>

                                <Link
                                    href="/upload"
                                    className="rounded-lg border border-[#cbd5e1] bg-white px-6 py-3.5 text-center text-sm font-semibold text-[#334155] transition hover:bg-[#f1f5f9] hover:text-[#334155]"
                                >
                                    Explore the learning flow
                                </Link>

                            </div>

                            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-[#94a3b8]">

                                <span>
                                    PDF learning material
                                </span>

                                <span>
                                    Knowledge mapping
                                </span>

                                <span>
                                    Diagnostic assessment
                                </span>

                                <span>
                                    Progress tracking
                                </span>

                            </div>

                        </div>

                        {/* REAL PRODUCT PREVIEW */}

                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 shadow-sm">

                            <div className="rounded-lg border border-[#e2e8f0] bg-white">

                                {/* HEADER */}

                                <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">

                                    <div>

                                        <div className="text-xs font-medium text-[#94a3b8]">
                                            CURRENT STUDY AREA
                                        </div>

                                        <div className="mt-1 max-w-[260px] truncate font-semibold text-[#172033]">
                                            {studyTitle}
                                        </div>

                                    </div>

                                    <div className="rounded-md bg-[#f0fdf4] px-2.5 py-1 text-xs font-semibold text-[#15803d]">

                                        {hasMaterial
                                            ? quizResult
                                                ? "Assessed"
                                                : "In progress"
                                            : "Not started"}

                                    </div>

                                </div>

                                {/* STATS */}

                                <div className="grid grid-cols-3 divide-x divide-[#e2e8f0] border-b border-[#e2e8f0]">

                                    <PreviewStat
                                        value={
                                            concepts.length
                                        }
                                        label="Concepts"
                                    />

                                    <PreviewStat
                                        value={
                                            connections
                                        }
                                        label="Connections"
                                    />

                                    <PreviewStat
                                        value={
                                            reviewCount
                                        }
                                        label="Review"
                                    />

                                </div>

                                {/* KNOWLEDGE PREVIEW */}

                                <div className="p-5">

                                    <div className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                                        Knowledge map
                                    </div>

                                    {!hasMaterial && (
                                        <div className="rounded-lg border border-dashed border-[#cbd5e1] px-4 py-7 text-center">

                                            <div className="text-sm font-semibold text-[#475569]">
                                                No learning material yet
                                            </div>

                                            <div className="mt-1 text-xs leading-5 text-[#94a3b8]">
                                                Upload a PDF or paste
                                                your study material
                                                to build your map.
                                            </div>

                                        </div>
                                    )}

                                    {hasMaterial &&
                                        conceptRows.length >
                                        0 && (
                                            <div className="space-y-3">

                                                {conceptRows.map(
                                                    (
                                                        concept
                                                    ) => (
                                                        <MapRow
                                                            key={
                                                                concept.name
                                                            }
                                                            name={
                                                                concept.name
                                                            }
                                                            status={
                                                                concept.status
                                                            }
                                                            warning={
                                                                concept.warning
                                                            }
                                                        />
                                                    )
                                                )}

                                            </div>
                                        )}

                                    {hasMaterial &&
                                        conceptRows.length ===
                                        0 && (
                                            <div className="rounded-lg border border-dashed border-[#cbd5e1] px-4 py-7 text-center text-sm text-[#94a3b8]">
                                                Concepts are being
                                                prepared.
                                            </div>
                                        )}

                                    {concepts.length >
                                        5 && (
                                            <div className="mt-4 text-center text-xs text-[#94a3b8]">
                                                Showing 5 of{" "}
                                                {
                                                    concepts.length
                                                }{" "}
                                                concepts
                                            </div>
                                        )}

                                </div>

                                {/* RECOMMENDATION */}

                                <div className="border-t border-[#e2e8f0] bg-[#f8fafc] p-5">

                                    <div className="text-xs font-semibold text-[#94a3b8]">
                                        NEXT RECOMMENDATION
                                    </div>

                                    {!hasMaterial && (
                                        <>
                                            <div className="mt-2 font-semibold text-[#172033]">
                                                Upload your study material
                                            </div>

                                            <div className="mt-1 text-sm text-[#64748b]">
                                                EduGap needs your material
                                                before it can recommend
                                                what to study next.
                                            </div>

                                            <Link
                                                href="/upload"
                                                className="mt-4 inline-block text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                                            >
                                                Upload material →
                                            </Link>
                                        </>
                                    )}

                                    {hasMaterial &&
                                        !weakestConcept && (
                                            <>
                                                <div className="mt-2 font-semibold text-[#172033]">
                                                    Take the diagnostic quiz
                                                </div>

                                                <div className="mt-1 text-sm text-[#64748b]">
                                                    Answer the generated
                                                    questions so EduGap can
                                                    identify your actual
                                                    learning gaps.
                                                </div>

                                                <Link
                                                    href="/quiz"
                                                    className="mt-4 inline-block text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                                                >
                                                    Start assessment →
                                                </Link>
                                            </>
                                        )}

                                    {weakestConcept && (
                                        <>
                                            <div className="mt-2 font-semibold text-[#172033]">
                                                Review{" "}
                                                {
                                                    weakestConcept.name
                                                }
                                            </div>

                                            <div className="mt-1 text-sm text-[#64748b]">
                                                Strengthen this concept
                                                before retrying the
                                                assessment.
                                            </div>

                                            <Link
                                                href="/learning"
                                                className="mt-4 inline-block text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                                            >
                                                Start review →
                                            </Link>
                                        </>
                                    )}

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>

            {/* =========================================
                ACCOUNT / WELCOME
            ========================================= */}

            <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">

                {mounted &&
                    !signedIn && (
                        <div className="flex flex-col gap-5 rounded-xl border border-[#e2e8f0] bg-white p-6 md:flex-row md:items-center md:justify-between">

                            <div>

                                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                                    Get started
                                </div>

                                <h2 className="mt-2 text-xl font-bold text-[#172033]">
                                    Save your learning progress
                                </h2>

                                <p className="mt-1 text-sm text-[#64748b]">
                                    Create an account to keep your
                                    assessments, progress, and rewards
                                    together.
                                </p>

                            </div>

                            <div className="flex shrink-0 gap-3">

                                <Link
                                    href="/login"
                                    className="rounded-lg border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] hover:text-[#334155]"
                                >
                                    Sign in
                                </Link>

                                <Link
                                    href="/register"
                                    className="rounded-lg bg-[#344139] px-5 py-3 text-sm font-semibold !text-white hover:bg-[#4b5c50] hover:!text-white"
                                >
                                    Create account
                                </Link>

                            </div>

                        </div>
                    )}

                {mounted &&
                    signedIn && (
                        <div className="flex flex-col gap-5 rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-6 md:flex-row md:items-center md:justify-between">

                            <div>

                                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
                                    Your account
                                </div>
                                <h2 className="mt-2 text-xl font-bold text-[#172033]">
                                    Hello {user?.name || "there"} 👋
                                </h2>

                            </div>

                            <div className="flex flex-wrap gap-3">

                                <Link
                                    href="/upload"
                                    className="rounded-lg bg-[#344139] px-5 py-3 text-sm font-semibold !text-white hover:bg-[#4b5c50] hover:!text-white"
                                >
                                    Continue learning
                                </Link>

                                <button
                                    type="button"
                                    onClick={
                                        handleSignOut
                                    }
                                    className="rounded-lg border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] hover:text-[#334155]"
                                >
                                    Sign out
                                </button>

                            </div>

                        </div>
                    )}

            </section>

            {/* =========================================
                HOW IT WORKS
            ========================================= */}

            <section className="border-y border-[#e2e8f0] bg-white">

                <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-18">

                    <div className="max-w-2xl">

                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
                            How it works
                        </div>

                        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#172033]">
                            A focused learning process
                        </h2>

                        <p className="mt-3 text-[#64748b]">
                            EduGap turns your study material
                            and assessment results into a
                            practical learning path.
                        </p>

                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-4">

                        <ProcessStep
                            number="01"
                            title="Upload"
                            text="Add your chapter, notes, or study material."
                        />

                        <ProcessStep
                            number="02"
                            title="Assess"
                            text="Answer questions designed around the material."
                        />

                        <ProcessStep
                            number="03"
                            title="Review"
                            text="Identify the concepts that need more attention."
                        />

                        <ProcessStep
                            number="04"
                            title="Improve"
                            text="Study, retry, and track your progress."
                        />

                    </div>

                </div>

            </section>

            {/* =========================================
                FINAL CTA
            ========================================= */}

            <section>

                <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">

                    <div className="flex flex-col gap-7 rounded-xl bg-[#172033] p-8 md:flex-row md:items-center md:justify-between md:p-10">

                        <div>

                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#93c5fd]">
                                Ready to begin?
                            </div>

                            <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">
                                Start with the material
                                you need to learn.
                            </h2>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-[#cbd5e1]">
                                Build your knowledge map and
                                discover where to focus next.
                            </p>

                        </div>

                        <Link
                            href="/upload"
                            className="shrink-0 rounded-lg bg-white px-6 py-3.5 text-center text-sm font-semibold text-[#172033] transition hover:bg-[#f1f5f9] hover:text-[#172033]"
                        >
                            Upload material →
                        </Link>

                    </div>

                </div>

            </section>

        </main>
    );
}


/* ============================================================
   DATA HELPERS
============================================================ */

function getConnectionCount(
    graph,
    concepts
) {
    if (
        typeof graph?.edge_count ===
        "number"
    ) {
        return graph.edge_count;
    }

    if (
        Array.isArray(
            graph?.edges
        )
    ) {
        return graph.edges.length;
    }

    let count = 0;

    concepts.forEach(
        (concept) => {
            count += Array.isArray(
                concept.prerequisites
            )
                ? concept.prerequisites
                    .length
                : 0;
        }
    );

    return count;
}


function getWeakestConcept(
    concepts,
    conceptStats
) {
    let weakest = null;
    let weakestScore = Infinity;

    concepts.forEach(
        (concept) => {
            const stats =
                conceptStats[
                concept.name
                ];

            if (
                !stats ||
                !stats.total
            ) {
                return;
            }

            const score =
                stats.correct /
                stats.total;

            if (
                score <
                weakestScore
            ) {
                weakestScore = score;

                weakest = {
                    ...concept,
                    score:
                        Math.round(
                            score * 100
                        ),
                };
            }
        }
    );

    return weakest;
}


/* ============================================================
   SMALL COMPONENTS
============================================================ */

function PreviewStat({
    value,
    label,
}) {
    return (
        <div className="px-4 py-4 text-center">

            <div className="text-xl font-bold text-[#172033]">
                {value}
            </div>

            <div className="mt-1 text-[11px] text-[#94a3b8]">
                {label}
            </div>

        </div>
    );
}


function MapRow({
    name,
    status,
    warning = false,
}) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-[#e2e8f0] px-4 py-3">

            <div className="flex items-center gap-3">

                <span
                    className={`h-2 w-2 rounded-full ${warning
                        ? "bg-[#f59e0b]"
                        : status ===
                            "Strong"
                            ? "bg-[#22c55e]"
                            : "bg-[#94a3b8]"
                        }`}
                />

                <span className="max-w-[190px] truncate text-sm font-medium text-[#334155]">
                    {name}
                </span>

            </div>

            <span
                className={`text-xs font-semibold ${warning
                    ? "text-[#b7791f]"
                    : status ===
                        "Strong"
                        ? "text-[#15803d]"
                        : "text-[#64748b]"
                    }`}
            >
                {status}
            </span>

        </div>
    );
}


function ProcessStep({
    number,
    title,
    text,
}) {
    return (
        <div className="border-t-2 border-[#e2e8f0] pt-5">

            <div className="text-xs font-bold text-[#2563eb]">
                {number}
            </div>

            <h3 className="mt-3 text-lg font-bold text-[#172033]">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#64748b]">
                {text}
            </p>

        </div>
    );
}
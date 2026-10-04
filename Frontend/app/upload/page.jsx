"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Upload from "../../components/Upload";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

export default function UploadPage() {
    const router = useRouter();

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const handleSubmit = async ({
        file,
        text,
    }) => {
        setLoading(true);
        setError("");

        try {
            if (!file && !text?.trim()) {
                throw new Error(
                    "Please upload a PDF or paste some learning material."
                );
            }

            let response;

            try {
                if (file) {
                    const formData =
                        new FormData();

                    formData.append(
                        "file",
                        file
                    );

                    response = await fetch(
                        `${API_URL}/analyze-pdf`,
                        {
                            method: "POST",
                            body: formData,
                        }
                    );
                } else {
                    response = await fetch(
                        `${API_URL}/analyze-text`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                            body: JSON.stringify({
                                text: text.trim(),
                            }),
                        }
                    );
                }
            } catch {
                throw new Error(
                    `Cannot connect to EduGap backend at ${API_URL}. Make sure FastAPI is running on port 8000.`
                );
            }

            let data = null;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    "The backend returned an invalid response."
                );
            }

            if (!response.ok) {
                let message =
                    "EduGap could not analyze the material.";

                if (
                    typeof data?.detail ===
                    "string"
                ) {
                    message =
                        data.detail;
                } else if (
                    Array.isArray(
                        data?.detail
                    )
                ) {
                    message =
                        data.detail
                            .map(
                                (item) =>
                                    item.msg ||
                                    JSON.stringify(
                                        item
                                    )
                            )
                            .join(", ");
                } else if (
                    data?.detail
                ) {
                    message =
                        JSON.stringify(
                            data.detail
                        );
                }

                throw new Error(message);
            }

            if (
                !data ||
                !Array.isArray(
                    data.concepts
                ) ||
                !Array.isArray(
                    data.questions
                )
            ) {
                throw new Error(
                    "The AI analysis was incomplete. Please try again."
                );
            }

            sessionStorage.setItem(
                "edugap_analysis",
                JSON.stringify(data)
            );

            sessionStorage.setItem(
                "edugap_source_text",
                data.source_text ||
                text ||
                ""
            );

            sessionStorage.setItem(
                "edugap_title",
                data.title ||
                file?.name ||
                "Learning Material"
            );

            sessionStorage.setItem(
                "edugap_concepts",
                JSON.stringify(
                    data.concepts
                )
            );

            sessionStorage.setItem(
                "edugap_questions",
                JSON.stringify(
                    data.questions
                )
            );

            sessionStorage.setItem(
                "edugap_graph",
                JSON.stringify(
                    data.graph || null
                )
            );

            if (file?.name) {
                sessionStorage.setItem(
                    "edugap_filename",
                    file.name
                );
            }

            sessionStorage.removeItem(
                "edugap_quiz_result"
            );

            sessionStorage.removeItem(
                "edugap_gap_concept"
            );

            sessionStorage.removeItem(
                "edugap_learning_concept"
            );

            sessionStorage.removeItem(
                "edugap_retry_result"
            );

            router.push("/knowledge");
        } catch (error) {
            console.error(
                "EduGap upload failed:",
                error
            );

            setError(
                error?.message ||
                "Something went wrong while analyzing your material."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-12 md:py-16">

            <div className="mx-auto max-w-5xl">

                {/* HEADER */}
                <div className="mb-10">
                    <div className="text-xs font-semibold tracking-[0.3em] text-[#91a0b7]">
                        STEP 01 · START
                    </div>

                    <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                        Give EduGap something
                        <br />
                        to understand.
                    </h1>

                    <p className="mt-5 max-w-2xl text-lg leading-8 text-[#68778c]">
                        Upload your chapter, notes, or study
                        material. Or paste the text directly.
                        EduGap will extract the concepts and
                        build your knowledge map.
                    </p>
                </div>

                {/* UPLOAD + TEXT */}
                <Upload
                    onSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                />

                {/* LOADING STATE */}
                {loading && (
                    <div className="mt-7 rounded-[30px] bg-[#1b201d] p-7 text-white">
                        <div className="flex items-center gap-5">

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            </div>

                            <div>
                                <div className="font-bold">
                                    Building your knowledge map...
                                </div>

                                <div className="mt-1 text-sm text-[#aeb7b2]">
                                    Extracting concepts,
                                    prerequisites, and
                                    diagnostic questions.
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* SMALL FOOTER */}
                {!loading && (
                    <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-[#98a3b2]">
                        <span>PDF supported</span>
                        <span>·</span>
                        <span>Text supported</span>
                        <span>·</span>
                        <span>AI concept extraction</span>
                        <span>·</span>
                        <span>Knowledge graph</span>
                        <span>·</span>
                        <span>Diagnostic quiz</span>
                    </div>
                )}

            </div>
        </main>
    );
}
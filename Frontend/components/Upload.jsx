"use client";

import { useRef, useState } from "react";

export default function Upload({
    onSubmit,
    loading = false,
    error = "",
}) {
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [text, setText] = useState("");

    const handleFile = (selectedFile) => {
        if (!selectedFile) return;

        const isPdf =
            selectedFile.type === "application/pdf" ||
            selectedFile.name
                .toLowerCase()
                .endsWith(".pdf");

        if (!isPdf) {
            return;
        }

        setFile(selectedFile);
    };

    const handleSubmit = () => {
        if (!file && !text.trim()) {
            return;
        }

        onSubmit?.({
            file,
            text,
        });
    };

    return (
        <div className="w-full">

            {/* Hidden PDF input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) =>
                    handleFile(
                        event.target.files?.[0]
                    )
                }
            />

            {/* PDF UPLOAD */}
            <div
                onClick={() =>
                    !loading &&
                    fileInputRef.current?.click()
                }
                onDragOver={(event) => {
                    event.preventDefault();
                }}
                onDrop={(event) => {
                    event.preventDefault();

                    if (loading) return;

                    handleFile(
                        event.dataTransfer.files?.[0]
                    );
                }}
                className={`
                    group
                    flex min-h-[300px]
                    cursor-pointer
                    flex-col items-center justify-center
                    rounded-[34px]
                    border-2 border-dashed
                    px-8 py-10
                    text-center
                    transition duration-200
                    ${loading
                        ? "cursor-not-allowed border-[#dedbd3] bg-[#f7f6f2]"
                        : "border-[#d5d3cc] bg-white hover:border-[#9ba89d] hover:bg-[#fafbf8]"
                    }
                `}
            >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef1eb] text-3xl text-[#536257] transition duration-200 group-hover:scale-105">
                    ↑
                </div>

                {file ? (
                    <>
                        <div className="mt-6 max-w-full truncate text-xl font-black text-[#171717]">
                            {file.name}
                        </div>

                        <div className="mt-2 text-sm font-medium text-[#758277]">
                            PDF selected
                        </div>

                        <div className="mt-4 rounded-full bg-[#e8eee8] px-4 py-2 text-xs font-semibold text-[#536257]">
                            Click to choose another PDF
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mt-6 text-2xl font-black text-[#171717]">
                            Upload your PDF
                        </div>

                        <p className="mt-3 max-w-md text-[#7c8796]">
                            Drag and drop your study material here,
                            or click to browse your computer.
                        </p>

                        <div className="mt-5 rounded-full bg-[#f1efe9] px-4 py-2 text-xs font-semibold tracking-wide text-[#687588]">
                            PDF files only
                        </div>
                    </>
                )}
            </div>

            {/* DIVIDER */}
            <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#dedbd3]" />

                <span className="text-xs font-bold tracking-[0.2em] text-[#9aa4b1]">
                    OR
                </span>

                <div className="h-px flex-1 bg-[#dedbd3]" />
            </div>

            {/* TEXT INPUT */}
            <div className="rounded-[34px] border border-[#dedbd3] bg-white p-7 md:p-8">

                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef1eb] text-xl">
                        ✎
                    </div>

                    <div>
                        <div className="text-xl font-black text-[#171717]">
                            Paste your study material
                        </div>

                        <p className="mt-1 text-sm leading-6 text-[#7c8796]">
                            Have notes, a paragraph, or a section
                            from your textbook? Paste it here instead.
                        </p>
                    </div>
                </div>

                <textarea
                    value={text}
                    onChange={(event) =>
                        setText(event.target.value)
                    }
                    disabled={loading}
                    placeholder="Paste your notes, textbook section, lecture content, or study material here..."
                    className="
                        mt-6
                        min-h-[190px]
                        w-full
                        resize-y
                        rounded-[24px]
                        border border-[#d8d6d0]
                        bg-[#faf9f6]
                        p-5
                        text-base
                        leading-7
                        text-[#171717]
                        outline-none
                        placeholder:text-[#a2a9b3]
                        transition
                        focus:border-[#9ba89d]
                        focus:bg-white
                    "
                />

                <div className="mt-3 flex justify-between text-xs text-[#9ba4b0]">
                    <span>
                        Text will be analyzed by EduGap AI
                    </span>

                    <span>
                        {text.length} characters
                    </span>
                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="mt-6 rounded-[22px] border border-[#efd1cc] bg-[#fff3f1] px-5 py-4 text-sm leading-6 text-[#a94c43]">
                    {error}
                </div>
            )}

            {/* SUBMIT */}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={
                    loading ||
                    (!file && !text.trim())
                }
                className="
                    mt-7
                    w-full
                    rounded-full
                    bg-[#344139]
                    px-8 py-5
                    text-lg font-bold
                    !text-white
                    transition duration-200
                    hover:bg-[#4b5c50]
                    hover:!text-white
                    active:bg-[#4b5c50]
                    active:!text-white
                    disabled:cursor-not-allowed
                    disabled:opacity-45
                "
            >
                {loading
                    ? "Building your knowledge map..."
                    : "Build my knowledge map →"}
            </button>

            <p className="mt-5 text-center text-sm text-[#9ba4b0]">
                Your material stays focused on your learning journey.
            </p>
        </div>
    );
}
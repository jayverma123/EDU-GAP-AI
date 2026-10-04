"use client";

export default function Learning({
    concept,
    onRetry,
}) {
    if (!concept) {
        return (
            <div className="rounded-[32px] bg-white p-10 text-center">
                <div className="text-2xl font-bold">
                    No learning gap selected
                </div>

                <p className="mt-3 text-[#8794a8]">
                    Complete the diagnostic quiz first.
                </p>
            </div>
        );
    }

    const prerequisites = Array.isArray(
        concept.prerequisites
    )
        ? concept.prerequisites
        : [];

    return (
        <div className="mx-auto max-w-4xl">

            {/* HEADER */}

            <div className="mb-8">
                <div className="text-xs tracking-[0.3em] text-[#91a0b7]">
                    TARGETED LEARNING
                </div>

                <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                    Let's close this gap.
                </h1>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-[#69788d]">
                    EduGap has identified one concept that needs
                    more attention. Focus here before moving forward.
                </p>
            </div>

            {/* CONCEPT */}

            <div className="rounded-[38px] bg-[#1b201d] p-8 text-white md:p-10">
                <div className="text-xs tracking-[0.3em] text-[#89978f]">
                    FOCUS CONCEPT
                </div>

                <h2 className="mt-4 text-4xl font-bold">
                    {concept.name}
                </h2>

                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#b0bab5]">
                    {concept.description ||
                        "This concept needs additional practice before you continue."}
                </p>
            </div>

            {/* PREREQUISITES */}

            {prerequisites.length > 0 && (
                <div className="mt-6 rounded-[30px] border border-[#dedbd3] bg-white p-7">
                    <div className="text-xs tracking-[0.25em] text-[#91a0b7]">
                        PREREQUISITES
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        {prerequisites.map(
                            (
                                prerequisite,
                                index
                            ) => (
                                <div
                                    key={`${prerequisite}-${index}`}
                                    className="rounded-full bg-[#f1efe9] px-5 py-3 text-sm font-semibold"
                                >
                                    {prerequisite}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* LEARNING EXPLANATION */}

            <div className="mt-6 grid gap-6 md:grid-cols-2">

                <div className="rounded-[30px] bg-white p-7">
                    <div className="text-xs tracking-[0.25em] text-[#91a0b7]">
                        UNDERSTAND
                    </div>

                    <h3 className="mt-3 text-xl font-bold">
                        What you need to know
                    </h3>

                    <p className="mt-4 leading-7 text-[#68778c]">
                        {concept.description ||
                            `Review the core ideas behind ${concept.name} and understand how they connect to its prerequisites.`}
                    </p>
                </div>

                <div className="rounded-[30px] bg-[#e8eee8] p-7">
                    <div className="text-xs tracking-[0.25em] text-[#728377]">
                        RECOVERY PATH
                    </div>

                    <h3 className="mt-3 text-xl font-bold">
                        Learn → Practice → Retry
                    </h3>

                    <p className="mt-4 leading-7 text-[#617266]">
                        Study this concept, then take a short retry
                        challenge to check whether the gap has closed.
                    </p>
                </div>

            </div>

            {/* RETRY */}

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-8 w-full rounded-full bg-[#171717] py-5 font-semibold text-white transition hover:scale-[1.01] hover:bg-[#344139]"
                >
                    I'm ready — take the retry challenge →
                </button>
            )}

        </div>
    );
}
"use client";

export default function GapAnalysis({
    result,
    concept,
    onContinue,
}) {
    const percentage = result?.percentage ?? 0;

    const correct = result?.correct ?? 0;
    const total = result?.total ?? 0;

    return (
        <div className="space-y-6">

            {/* MAIN GAP */}
            <div className="rounded-[34px] bg-[#1b201d] p-8 text-white md:p-10">

                <div className="text-xs tracking-[0.3em] text-[#87958e]">
                    LEARNING GAP
                </div>

                <div className="mt-4 text-4xl font-bold">
                    {concept?.name || "Concept not identified"}
                </div>

                <p className="mt-4 max-w-2xl leading-7 text-[#aeb7b2]">
                    {concept?.description ||
                        "EduGap detected that this concept needs additional practice."}
                </p>

            </div>


            {/* STATS */}
            <div className="grid gap-4 md:grid-cols-3">

                <div className="rounded-[26px] bg-white p-6">

                    <div className="text-xs tracking-[0.2em] text-[#94a0b0]">
                        SCORE
                    </div>

                    <div className="mt-3 text-4xl font-black">
                        {percentage}%
                    </div>

                </div>


                <div className="rounded-[26px] bg-white p-6">

                    <div className="text-xs tracking-[0.2em] text-[#94a0b0]">
                        CORRECT
                    </div>

                    <div className="mt-3 text-4xl font-black">
                        {correct}
                        <span className="text-xl text-[#9ba6b7]">
                            /{total}
                        </span>
                    </div>

                </div>


                <div className="rounded-[26px] bg-white p-6">

                    <div className="text-xs tracking-[0.2em] text-[#94a0b0]">
                        STATUS
                    </div>

                    <div className="mt-3 text-2xl font-bold">
                        {percentage >= 70
                            ? "Strong"
                            : percentage >= 50
                                ? "Developing"
                                : "Needs focus"}
                    </div>

                </div>

            </div>


            {/* WHY */}
            <div className="rounded-[30px] border border-[#dedbd3] bg-white p-7">

                <div className="text-xs tracking-[0.25em] text-[#91a0b7]">
                    WHY THIS GAP?
                </div>

                <p className="mt-4 max-w-3xl leading-7 text-[#61728b]">
                    EduGap compares performance across the concepts
                    tested in your diagnostic quiz and identifies the
                    concept with the weakest demonstrated mastery.
                </p>

            </div>


            {/* CTA */}
            {onContinue && (
                <button
                    onClick={onContinue}
                    className="w-full rounded-full bg-[#171717] py-5 font-semibold text-white transition hover:scale-[1.01]"
                >
                    Learn this concept →
                </button>
            )}

        </div>
    );
}
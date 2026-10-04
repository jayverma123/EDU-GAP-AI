"use client";

export default function Loading({
    text = "Preparing your learning journey..."
}) {
    return (
        <div className="flex min-h-[300px] items-center justify-center">

            <div className="text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#d7d4cc] bg-white">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d7d4cc] border-t-[#171717]" />
                </div>

                <div className="mt-6 text-lg font-semibold">
                    {text}
                </div>

                <div className="mt-2 text-sm text-[#8794a8]">
                    EduGap AI is connecting the dots.
                </div>

            </div>

        </div>
    );
}
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (
            !name.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword
        ) {
            setError("Please fill in all fields.");
            return;
        }

        if (password.length < 6) {
            setError(
                "Password must contain at least 6 characters."
            );
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/auth/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.detail ||
                    "Could not create your account."
                );
            }

            const user = data.user;

            if (!user?.id) {
                throw new Error(
                    "Account was created, but the user ID was not returned."
                );
            }

            /*
             * Store only the authenticated user's identity.
             *
             * XP and coins are NOT stored here.
             * They are calculated and persisted by the backend.
             */
            sessionStorage.setItem(
                "edugap_user",
                JSON.stringify({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                })
            );

            /*
             * Keep a direct user ID as well because
             * Quiz.jsx can use it easily.
             */
            sessionStorage.setItem(
                "edugap_user_id",
                String(user.id)
            );

            /*
             * Remove old fake browser-based values.
             */
            localStorage.removeItem("edugap_account");
            sessionStorage.removeItem("edugap_xp");
            sessionStorage.removeItem("edugap_coins");

            router.push("/");
        } catch (err) {
            console.error("Registration error:", err);

            if (
                err instanceof TypeError &&
                err.message.includes("fetch")
            ) {
                setError(
                    "Cannot connect to the EduGap server. Please make sure the backend is running."
                );
            } else {
                setError(
                    err.message ||
                    "Something went wrong. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-12 md:py-16">

            <div className="mx-auto max-w-5xl">

                <div className="grid overflow-hidden rounded-[40px] bg-white shadow-sm md:grid-cols-2">

                    {/* LEFT */}

                    <div className="hidden bg-[#e8eee8] p-12 md:flex md:flex-col md:justify-between">

                        <div>

                            <Link
                                href="/"
                                className="flex items-center gap-3"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#171717] font-black text-white">
                                    E
                                </div>

                                <div>
                                    <div className="text-xl font-black">
                                        EduGap
                                    </div>

                                    <div className="text-[8px] tracking-[0.3em] text-[#718277]">
                                        SMART LEARNING
                                    </div>
                                </div>
                            </Link>

                            <div className="mt-24">

                                <div className="text-xs font-semibold tracking-[0.3em] text-[#718277]">
                                    START YOUR JOURNEY
                                </div>

                                <h1 className="mt-5 text-5xl font-black leading-tight">
                                    Learn smarter.
                                </h1>

                                <p className="mt-6 max-w-md text-lg leading-8 text-[#617266]">
                                    Create your EduGap account
                                    and start finding and
                                    closing your learning gaps.
                                </p>

                            </div>

                        </div>

                        <div className="text-sm text-[#718277]">
                            Learn → Diagnose → Recover → Improve
                        </div>

                    </div>


                    {/* RIGHT */}

                    <div className="p-7 sm:p-10 md:p-12">

                        <div className="md:hidden">

                            <Link
                                href="/"
                                className="flex items-center gap-3"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] font-black text-white">
                                    E
                                </div>

                                <div className="text-xl font-black">
                                    EduGap
                                </div>
                            </Link>

                        </div>


                        <div className="mt-8 md:mt-0">

                            <div className="text-xs font-semibold tracking-[0.3em] text-[#91a0b7]">
                                CREATE ACCOUNT
                            </div>

                            <h2 className="mt-4 text-4xl font-black">
                                Start learning.
                            </h2>

                            <p className="mt-3 leading-7 text-[#68778c]">
                                Create your account and
                                start your personalized
                                learning journey.
                            </p>


                            <form
                                onSubmit={handleSubmit}
                                className="mt-8 space-y-5"
                            >

                                {/* NAME */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold">
                                        Full name
                                    </label>

                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(event) =>
                                            setName(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Your name"
                                        autoComplete="name"
                                        disabled={loading}
                                        className="w-full rounded-2xl border border-[#d9d7d1] bg-[#faf9f6] px-5 py-4 outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                    />

                                </div>


                                {/* EMAIL */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold">
                                        Email address
                                    </label>

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(
                                                event.target.value
                                            )
                                        }
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        disabled={loading}
                                        className="w-full rounded-2xl border border-[#d9d7d1] bg-[#faf9f6] px-5 py-4 outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                    />

                                </div>


                                {/* PASSWORD */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold">
                                        Password
                                    </label>

                                    <div className="relative">

                                        <input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="At least 6 characters"
                                            autoComplete="new-password"
                                            disabled={loading}
                                            className="w-full rounded-2xl border border-[#d9d7d1] bg-[#faf9f6] px-5 py-4 pr-20 outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    !showPassword
                                                )
                                            }
                                            disabled={loading}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#78869a]"
                                        >
                                            {showPassword
                                                ? "Hide"
                                                : "Show"}
                                        </button>

                                    </div>

                                </div>


                                {/* CONFIRM */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold">
                                        Confirm password
                                    </label>

                                    <div className="relative">

                                        <input
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={confirmPassword}
                                            onChange={(event) =>
                                                setConfirmPassword(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter password again"
                                            autoComplete="new-password"
                                            disabled={loading}
                                            className="w-full rounded-2xl border border-[#d9d7d1] bg-[#faf9f6] px-5 py-4 pr-20 outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    !showConfirmPassword
                                                )
                                            }
                                            disabled={loading}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#78869a]"
                                        >
                                            {showConfirmPassword
                                                ? "Hide"
                                                : "Show"}
                                        </button>

                                    </div>

                                </div>


                                {/* ERROR */}

                                {error && (
                                    <div className="rounded-2xl bg-[#fff0ee] px-5 py-4 text-sm text-[#b44b42]">
                                        {error}
                                    </div>
                                )}


                                {/* BUTTON */}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-[#171717] py-4 font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading
                                        ? "Creating account..."
                                        : "Create account →"}
                                </button>

                            </form>


                            {/* LOGIN */}

                            <div className="mt-8 border-t border-[#e5e2db] pt-7 text-center">

                                <p className="text-sm text-[#8794a8]">
                                    Already have an account?
                                </p>

                                <Link
                                    href="/login"
                                    className="mt-3 inline-block font-bold text-[#171717] underline underline-offset-4"
                                >
                                    Sign in to EduGap
                                </Link>

                            </div>


                            <Link
                                href="/"
                                className="mt-7 block text-center text-sm font-semibold text-[#8794a8]"
                            >
                                ← Back to Home
                            </Link>

                        </div>

                    </div>

                </div>

            </div>

        </main>
    );
}
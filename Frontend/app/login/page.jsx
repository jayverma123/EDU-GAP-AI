"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!email.trim() || !password.trim()) {
            setError("Please enter your email and password.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.detail ||
                    "The email or password is incorrect."
                );
            }

            const user = data.user;

            if (!user?.id) {
                throw new Error(
                    "Login succeeded, but the user ID was not returned."
                );
            }

            /*
             * Store the REAL database user identity.
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
             * Store the database ID separately.
             * Quiz.jsx will use this ID when creating
             * and submitting quizzes.
             */
            sessionStorage.setItem(
                "edugap_user_id",
                String(user.id)
            );

            /*
             * Remove old browser-based account data.
             * Authentication is now handled by the backend.
             */
            localStorage.removeItem("edugap_account");

            /*
             * XP and coins come from the backend.
             * Do not create fake local values.
             */
            sessionStorage.removeItem("edugap_xp");
            sessionStorage.removeItem("edugap_coins");

            router.push("/");
        } catch (err) {
            console.error("Login error:", err);

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
                                    WELCOME BACK
                                </div>

                                <h1 className="mt-5 text-5xl font-black leading-tight">
                                    Keep learning.
                                </h1>

                                <p className="mt-6 max-w-md text-lg leading-8 text-[#617266]">
                                    Continue your personalized
                                    learning journey and close
                                    the gaps that matter.
                                </p>

                            </div>

                        </div>

                        <div className="text-sm text-[#718277]">
                            Learn → Diagnose → Recover → Improve
                        </div>

                    </div>


                    {/* RIGHT */}

                    <div className="p-7 sm:p-10 md:p-12">

                        {/* MOBILE LOGO */}

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
                                SIGN IN
                            </div>

                            <h2 className="mt-4 text-4xl font-black">
                                Welcome back.
                            </h2>

                            <p className="mt-3 leading-7 text-[#68778c]">
                                Sign in to continue your
                                personalized learning journey.
                            </p>


                            <form
                                onSubmit={handleSubmit}
                                className="mt-8 space-y-5"
                            >

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
                                            placeholder="Your password"
                                            autoComplete="current-password"
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


                                {/* ERROR */}

                                {error && (
                                    <div className="rounded-2xl bg-[#fff0ee] px-5 py-4 text-sm text-[#b44b42]">
                                        {error}
                                    </div>
                                )}


                                {/* LOGIN BUTTON */}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-[#171717] py-4 font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading
                                        ? "Signing in..."
                                        : "Sign in →"}
                                </button>

                            </form>


                            {/* REGISTER */}

                            <div className="mt-8 border-t border-[#e5e2db] pt-7 text-center">

                                <p className="text-sm text-[#8794a8]">
                                    Don't have an account?
                                </p>

                                <Link
                                    href="/register"
                                    className="mt-3 inline-block font-bold text-[#171717] underline underline-offset-4"
                                >
                                    Create an EduGap account
                                </Link>

                            </div>


                            {/* HOME */}

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
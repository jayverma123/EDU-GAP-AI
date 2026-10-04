"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getProfile,
    getStreak,
    getCoins,
    getStoredUserId,
} from "../../lib/api";

export default function RewardsPage() {
    const router = useRouter();

    const [retryResult, setRetryResult] =
        useState(null);

    const [concept, setConcept] =
        useState(null);

    const [progress, setProgress] =
        useState(null);

    const [streak, setStreak] =
        useState(null);

    const [coins, setCoins] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [claimed, setClaimed] =
        useState(false);

    useEffect(() => {
        const loadRewards = async () => {
            try {
                const storedRetry =
                    sessionStorage.getItem(
                        "edugap_retry_result"
                    );

                const storedConcept =
                    sessionStorage.getItem(
                        "edugap_gap_concept"
                    );

                if (storedRetry) {
                    setRetryResult(
                        JSON.parse(storedRetry)
                    );
                }

                if (storedConcept) {
                    setConcept(
                        JSON.parse(storedConcept)
                    );
                }

                const userId =
                    getStoredUserId();

                if (!userId) {
                    setLoading(false);
                    return;
                }

                const [
                    profileData,
                    progressData,
                    streakData,
                    coinsData,
                ] = await Promise.all([
                    getProfile(userId),
                    getProgress(userId),
                    getStreak(userId),
                    getCoins(userId),
                ]);

                setProgress(progressData);
                setStreak(streakData);
                setCoins(coinsData);

                /*
                 * The backend is now the source of truth
                 * for XP, level, coins and streak.
                 */
                if (
                    profileData?.xp !== undefined ||
                    profileData?.coins !== undefined
                ) {
                    setProgress((current) => ({
                        ...(current || {}),
                        ...profileData,
                    }));
                }
            } catch (error) {
                console.error(
                    "Could not load rewards:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        loadRewards();
    }, []);

    const retrySucceeded =
        retryResult?.correct === true;

    /*
     * These values come from the backend
     * /retry/submit response.
     */
    const earnedXP =
        Number(retryResult?.reward?.xp) || 0;

    const earnedCoins =
        Number(retryResult?.reward?.coins) || 0;

    const newXP =
        Number(
            retryResult?.total_xp ??
            progress?.total_xp ??
            progress?.xp ??
            0
        );

    const newCoins =
        Number(
            retryResult?.total_coins ??
            coins?.total_coins ??
            coins?.coins ??
            0
        );

    const currentLevel =
        retryResult?.level ||
        progress?.level ||
        getLevel(newXP).name;

    const previousXP =
        Math.max(
            0,
            newXP - earnedXP
        );

    const previousLevel =
        getLevel(previousXP);

    const currentLevelObject =
        getLevel(newXP);

    const leveledUp =
        currentLevel !==
        previousLevel.name;

    const streakNumber =
        Number(
            retryResult?.streak ??
            streak?.current_streak ??
            0
        );

    const streakRewardXP =
        Number(
            retryResult?.streak_reward?.xp
        ) || 0;

    const streakRewardCoins =
        Number(
            retryResult?.streak_reward?.coins
        ) || 0;

    const newBadges =
        retryResult?.new_badges || [];

    const totalEarnedXP =
        earnedXP + streakRewardXP;

    const totalEarnedCoins =
        earnedCoins + streakRewardCoins;

    const claimRewards = () => {
        /*
         * Nothing is written to XP or coins here.
         *
         * The backend already persisted the reward when
         * /retry/submit was called.
         *
         * This button only completes the UI flow.
         */
        sessionStorage.setItem(
            "edugap_last_reward",
            JSON.stringify({
                xp: totalEarnedXP,
                coins: totalEarnedCoins,
                badge:
                    retrySucceeded
                        ? "Gap Crusher"
                        : null,
                concept:
                    concept?.name || "",
            })
        );

        setClaimed(true);
    };

    const restart = () => {
        sessionStorage.removeItem(
            "edugap_retry_result"
        );

        sessionStorage.removeItem(
            "edugap_gap_concept"
        );

        sessionStorage.removeItem(
            "edugap_learning_concept"
        );

        sessionStorage.removeItem(
            "edugap_retry_concept"
        );

        router.push("/upload");
    };

    if (loading) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-12">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#dedbd3] border-t-[#171717]" />

                        <div className="mt-6 text-xl font-bold">
                            Loading your progress...
                        </div>

                        <p className="mt-3 text-[#8794a8]">
                            Syncing your XP, coins and
                            learning progress.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (!retryResult) {
        return (
            <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-12">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-[36px] bg-white p-12 text-center">
                        <div className="text-2xl font-bold">
                            No retry result found
                        </div>

                        <p className="mt-3 text-[#8794a8]">
                            Complete the retry challenge before
                            viewing your rewards.
                        </p>

                        <button
                            onClick={() =>
                                router.push(
                                    "/retry"
                                )
                            }
                            className="mt-7 rounded-full bg-[#171717] px-7 py-4 font-semibold text-white"
                        >
                            Return to retry →
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-73px)] bg-[#f5f3ed] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <div className="mb-10 text-center">
                    <div className="text-xs font-semibold tracking-[0.3em] text-[#91a0b7]">
                        STEP 07 · PROGRESS
                    </div>

                    <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                        {retrySucceeded
                            ? "Gap crushed."
                            : "Progress made."}
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[#68778c]">
                        {retrySucceeded
                            ? `You improved your understanding of ${concept?.name || retryResult?.concept || "the concept"}.`
                            : "Every attempt moves your learning journey forward."}
                    </p>
                </div>

                {/* Main reward */}
                <div className="rounded-[38px] bg-[#171717] p-8 text-white md:p-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#f4e8b6] text-4xl">
                            {retrySucceeded
                                ? "✓"
                                : "↗"}
                        </div>

                        <div className="mt-7 text-xs font-semibold tracking-[0.3em] text-[#a7b0bd]">
                            REWARD UNLOCKED
                        </div>

                        <div className="mt-3 text-3xl font-black md:text-4xl">
                            {retrySucceeded
                                ? "Gap Crusher"
                                : "Keep Going"}
                        </div>

                        <p className="mt-3 max-w-xl leading-7 text-[#aeb5bf]">
                            {retrySucceeded
                                ? "You identified a weak concept, studied it, and successfully improved your understanding."
                                : "You attempted the recovery path. Keep practicing and come back stronger."}
                        </p>

                        {!claimed && (
                            <button
                                onClick={
                                    claimRewards
                                }
                                className="mt-8 rounded-full bg-white px-8 py-4 font-semibold text-[#171717] transition hover:scale-[1.03]"
                            >
                                Claim my rewards →
                            </button>
                        )}
                    </div>
                </div>

                {/* Reward numbers */}
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div className="rounded-[30px] bg-white p-7">
                        <div className="text-[10px] font-semibold tracking-[0.25em] text-[#91a0b7]">
                            XP EARNED
                        </div>

                        <div className="mt-3 text-5xl font-black">
                            +{totalEarnedXP}
                        </div>

                        <p className="mt-2 text-sm text-[#8794a8]">
                            Permanent learning progress
                        </p>
                    </div>

                    <div className="rounded-[30px] bg-white p-7">
                        <div className="text-[10px] font-semibold tracking-[0.25em] text-[#91a0b7]">
                            COINS EARNED
                        </div>

                        <div className="mt-3 text-5xl font-black">
                            +{totalEarnedCoins}
                        </div>

                        <p className="mt-2 text-sm text-[#8794a8]">
                            Spendable in-app learning currency
                        </p>
                    </div>
                </div>

                {/* Level */}
                <div className="mt-6 rounded-[30px] border border-[#dedbd3] bg-white p-7">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <div className="text-[10px] font-semibold tracking-[0.25em] text-[#91a0b7]">
                                CURRENT LEVEL
                            </div>

                            <div className="mt-2 text-3xl font-black">
                                {currentLevel}
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-black">
                                {newXP} XP
                            </div>

                            {leveledUp && (
                                <div className="mt-1 text-sm font-semibold text-[#71816f]">
                                    Level up!
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="h-3 overflow-hidden rounded-full bg-[#e3e1da]">
                            <div
                                className="h-full rounded-full bg-[#171717] transition-all duration-700"
                                style={{
                                    width: `${getProgress(
                                        newXP,
                                        currentLevelObject
                                    )}%`,
                                }}
                            />
                        </div>

                        <div className="mt-3 flex justify-between text-xs text-[#8794a8]">
                            <span>
                                {currentLevelObject.minXP} XP
                            </span>

                            <span>
                                {currentLevelObject.maxXP ===
                                    Infinity
                                    ? "Mastery"
                                    : `${currentLevelObject.maxXP} XP`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* XP vs coins */}
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div className="rounded-[28px] bg-[#e8eee8] p-7">
                        <div className="text-xs font-semibold tracking-[0.2em] text-[#718277]">
                            XP
                        </div>

                        <h2 className="mt-3 text-xl font-black">
                            Your learning progress
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-[#617266]">
                            XP permanently represents how much
                            progress you have made through the
                            learning journey.
                        </p>
                    </div>

                    <div className="rounded-[28px] bg-white p-7">
                        <div className="text-xs font-semibold tracking-[0.2em] text-[#91a0b7]">
                            COINS
                        </div>

                        <h2 className="mt-3 text-xl font-black">
                            Your learning currency
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-[#68778c]">
                            Coins can later be spent on hints,
                            extra practice, retries, and
                            customization.
                        </p>
                    </div>
                </div>

                {/* Finish */}
                {claimed && (
                    <div className="mt-8 rounded-[32px] bg-[#e8eee8] p-8 text-center">
                        <div className="text-2xl font-black">
                            Your progress is saved.
                        </div>

                        <p className="mt-3 text-[#617266]">
                            Ready to discover your next learning
                            gap?
                        </p>

                        <button
                            onClick={restart}
                            className="mt-6 rounded-full bg-[#171717] px-8 py-4 font-semibold text-white transition hover:scale-[1.02]"
                        >
                            Start another learning journey →
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

function getLevel(xp) {
    if (xp < 100) {
        return {
            name: "Beginner",
            minXP: 0,
            maxXP: 99,
        };
    }

    if (xp < 250) {
        return {
            name: "Explorer",
            minXP: 100,
            maxXP: 249,
        };
    }

    if (xp < 500) {
        return {
            name: "Learner",
            minXP: 250,
            maxXP: 499,
        };
    }

    if (xp < 1000) {
        return {
            name: "Skilled",
            minXP: 500,
            maxXP: 999,
        };
    }

    return {
        name: "Master",
        minXP: 1000,
        maxXP: Infinity,
    };
}

function getProgress(xp, level) {
    if (level.maxXP === Infinity) {
        return 100;
    }

    const range =
        level.maxXP - level.minXP + 1;

    const progress =
        ((xp - level.minXP) / range) *
        100;

    return Math.max(
        0,
        Math.min(100, progress)
    );
}
const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,

        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.detail ||
            data?.message ||
            "Something went wrong. Please try again.";

        throw new Error(message);
    }

    return data;
}


// ============================================================
// AUTH
// ============================================================

export async function register(payload) {
    return request("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}


export async function login(payload) {
    return request("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}


// ============================================================
// PROFILE
// ============================================================

export async function getProfile(userId) {
    return request(`/profile/${userId}`);
}


export async function getProgress(userId) {
    return request(`/profile/${userId}/progress`);
}


export async function getBadges(userId) {
    return request(`/profile/${userId}/badges`);
}


export async function getStreak(userId) {
    return request(`/profile/${userId}/streak`);
}


export async function getCoins(userId) {
    return request(`/profile/${userId}/coins`);
}


// ============================================================
// QUIZ
// ============================================================

export async function createQuiz(payload) {
    return request("/quiz/create", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}


export async function submitQuiz(payload) {
    return request("/quiz/submit", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}


// ============================================================
// RETRY
// ============================================================

export async function getRetryQuestions(userId) {
    return request(`/retry/${userId}`);
}


export async function submitRetry(payload) {
    return request("/retry/submit", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}


// ============================================================
// STORED USER
// ============================================================

export function getStoredUser() {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const storedUser =
            sessionStorage.getItem("edugap_user");

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);
    } catch {
        return null;
    }
}


export function getStoredUserId() {
    const user = getStoredUser();

    return user?.id
        ? Number(user.id)
        : null;
}


export { API_URL };
export function signOut() {
    if (typeof window === "undefined") {
        return;
    }

    /*
     * Remove authentication/session identity.
     */
    sessionStorage.removeItem("edugap_user");
    sessionStorage.removeItem("edugap_user_id");

    /*
     * Remove temporary learning-session data.
     *
     * These belong to the current learning journey,
     * not to the permanent database account.
     */
    const temporaryKeys = [
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

    temporaryKeys.forEach((key) => {
        sessionStorage.removeItem(key);
    });

    /*
     * Remove any old fake/local progress left over
     * from the earlier version of EduGap.
     */
    sessionStorage.removeItem("edugap_xp");
    sessionStorage.removeItem("edugap_coins");

    localStorage.removeItem("edugap_account");
}
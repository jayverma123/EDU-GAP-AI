"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pages = [
    { name: "Home", path: "/" },
    { name: "Upload", path: "/upload" },
    { name: "Knowledge", path: "/knowledge" },
    { name: "Quiz", path: "/quiz" },
    { name: "Gap", path: "/gap" },
    { name: "Learning", path: "/learning" },
    { name: "Retry", path: "/retry" },
    { name: "Rewards", path: "/rewards" },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-50 border-b border-[#dedbd3] bg-[#f5f3ed]/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-3 md:px-6">

                {/* LOGO */}
                <Link
                    href="/"
                    className="group flex shrink-0 items-center"
                >
                    <img
                        src="/edugap-logo-navbar.png"
                        alt="EduGap AI"
                        className="h-12 w-auto object-contain transition duration-200 group-hover:scale-[1.02]"
                    />
                </Link>

                <div className="hidden h-7 w-px bg-[#d8d5cd] md:block" />

                {/* NAVIGATION */}
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1">
                    {pages.map((page) => {
                        const active =
                            page.path === "/"
                                ? pathname === "/"
                                : pathname.startsWith(page.path);

                        return (
                            <Link
                                key={page.path}
                                href={page.path}
                                className={`
                                    shrink-0 whitespace-nowrap
                                    rounded-full px-4 py-2
                                    text-sm font-medium
                                    transition duration-200
                                    ${active
                                        ? "bg-[#dfe9df] text-[#344139]"
                                        : "text-[#66758d] hover:bg-[#e9eee8] hover:text-[#344139]"
                                    }
                                `}
                            >
                                {page.name}
                            </Link>
                        );
                    })}
                </div>

                {/* ACCOUNT ACTIONS */}
                <div className="hidden shrink-0 items-center gap-2 lg:flex">

                    {/* SIGN IN */}
                    <Link
                        href="/login"
                        className="
                            rounded-full
                            border border-[#d5d2ca]
                            bg-white
                            px-5 py-2.5
                            text-sm font-semibold
                            text-[#344139]
                            transition duration-200
                            hover:border-[#aeb8ad]
                            hover:bg-[#e9eee8]
                            hover:text-[#344139]
                            active:bg-[#e9eee8]
                            active:text-[#344139]
                        "
                    >
                        Sign in
                    </Link>

                    <Link
                        href="/register"
                        className="
                            rounded-full
                            bg-[#344139]
                            px-5 py-2.5
                            text-sm font-semibold !text-white
                            transition duration-200
                            hover:bg-[#4b5c50]
                            hover:!text-white
                            active:bg-[#4b5c50]
                            active:!text-white
                        "
                    >
                        Create account
                    </Link>

                </div>

            </div>
        </nav>
    );
}
import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
    title: "EduGap AI",
    description:
        "Find the learning gap behind the mistake.",
};

export default function RootLayout({
    children,
}) {
    return (
        <html lang="en">
            <body className="bg-[#f5f3ed] text-[#171717] antialiased">
                <Navbar />
                {children}
            </body>
        </html>
    );
}
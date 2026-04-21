import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NBA Guess Arena",
  description: "Guess the 2025-26 NBA regular season player in 8 rounds.",
};

/** Global app layout wrapper for all routes. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}


import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepoPlanner — planning cockpit & CLI",
  description:
    "RepoPlanner: XML-first .planning/ artifacts, repo-planner CLI, and embeddable React surfaces. Reference implementation; active work continues in get-anything-done.",
  openGraph: {
    title: "RepoPlanner",
    description: "Planning cockpit, CLI, and .planning/ file model — archived reference.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

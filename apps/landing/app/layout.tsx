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
    "RepoPlanner: XML-first .planning/ artifacts, repo-planner CLI, and embeddable React surfaces. Skillless Ralph-style loop for brownfield work; active framework + site at get-anything-done.vercel.app.",
  openGraph: {
    title: "RepoPlanner",
    description:
      "Archived reference: planning files, CLI, UI primitives, init bundle. Get Anything Done: get-anything-done.vercel.app.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

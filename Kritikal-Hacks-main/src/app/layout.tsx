import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ProjectScope — find the gap nobody filled",
    template: "%s · ProjectScope",
  },
  description:
    "Research existing hackathon projects and past winners, find the gaps nobody has filled, design a genuinely differentiated project. No problem statement required.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-full flex flex-col">
        <SmoothScroll />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./gradebook.css";

export const metadata: Metadata = {
  title: "Northbridge Student Gradebook",
  description:
    "A basic student grade tracker built with HTML, CSS, JavaScript, React, Java, and PostgreSQL.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="gradebook-body">{children}</body>
    </html>
  );
}

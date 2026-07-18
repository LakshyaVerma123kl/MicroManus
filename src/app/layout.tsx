import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MicroManus — Deep Research AI Agent",
  description: "A powerful AI research agent with web search, report generation, and multi-model support. Think → Search → Synthesize.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

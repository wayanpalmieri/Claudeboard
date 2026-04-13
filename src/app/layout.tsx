import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Claudeboard",
  description: "Manage all your Claude Code projects from one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className="h-full flex" suppressHydrationWarning>
        <Sidebar />
        <main className="flex-1 overflow-auto bg-[#161618]">
          {children}
        </main>
      </body>
    </html>
  );
}

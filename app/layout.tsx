import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Notes", template: "%s · Notes" },
  description: "Write rich-text notes and share them with a link.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

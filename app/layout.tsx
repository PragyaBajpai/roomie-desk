import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roomie Desk — flatmate matching for co-living operators",
  description: "Enquiries, deterministic flatmate matching and shortlists — operated from Claude via MCP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}

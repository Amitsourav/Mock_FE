import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Register — dMAT Mock",
  description:
    "Register for the dMAT mock examination — the Digital Master Test for students applying to Master's programmes in Germany.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches --surface in each scheme, so the mobile browser chrome blends in.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

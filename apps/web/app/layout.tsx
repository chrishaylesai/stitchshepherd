import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StitchHarbor",
  description: "Create, share, and export cross-stitch patterns."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

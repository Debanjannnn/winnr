import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistPixelLine } from "geist/font/pixel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Winnr",
  description: "Permissioned multi-agent market intelligence workflow",
  icons: { icon: "/logo-winnr-png.png" }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={GeistPixelLine.variable}>
      <body>{children}</body>
    </html>
  );
}

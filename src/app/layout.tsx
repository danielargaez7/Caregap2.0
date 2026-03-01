import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedAssist AI",
  description: "Clinical Decision Support powered by LLM + OpenEMR FHIR",
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

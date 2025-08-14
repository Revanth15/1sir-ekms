import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import LayoutWithConditionalNav from "@/components/layoutWithConditionalNav";

export const metadata: Metadata = {
  title: "1SIR EKMS",
  description: "Electronic Key Management System for 1SIR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="h-screen"
      >
        <LayoutWithConditionalNav>{children}</LayoutWithConditionalNav>
        <Toaster richColors position="top-right"/>
      </body>
    </html>
  );
}

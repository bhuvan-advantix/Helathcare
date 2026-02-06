import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Niraiva Health | Advanced Multi-Hospital Platform",
  description: "Seamless healthcare management for patients, doctors, and hospitals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased text-slate-800 bg-[#F7F9FA]`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

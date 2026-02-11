import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import HealthBot from "@/components/HealthBot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
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
        className={`${inter.className} ${inter.variable} font-sans antialiased text-slate-800 bg-[#F7F9FA] relative min-h-screen`}
      >
        <AuthProvider>
          {children}
          <HealthBot />
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mini CRM",
  description: "Simple contact and company management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b bg-white px-6 py-3 flex gap-6 items-center">
          <Link href="/" className="font-bold text-lg">
            Mini CRM
          </Link>
          <Link href="/persons" className="text-gray-600 hover:text-black">
            Persons
          </Link>
          <Link href="/companies" className="text-gray-600 hover:text-black">
            Companies
          </Link>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}

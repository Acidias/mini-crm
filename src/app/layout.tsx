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

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-text hover:bg-white/10 hover:text-white transition-colors text-sm"
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}

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
      <body className="min-h-full flex">
        <aside className="w-56 bg-sidebar-bg flex flex-col fixed h-full">
          <div className="px-5 py-5">
            <Link href="/" className="text-white font-bold text-lg tracking-tight">
              Mini CRM
            </Link>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            <NavLink href="/" icon="&#9632;" label="Dashboard" />
            <NavLink href="/persons" icon="&#9679;" label="Persons" />
            <NavLink href="/companies" icon="&#9670;" label="Companies" />
            <NavLink href="/events" icon="&#9733;" label="Events" />
            <NavLink href="/todos" icon="&#9745;" label="To-Dos" />
            <NavLink href="/calendar" icon="&#9776;" label="Calendar" />
          </nav>
          <div className="px-5 py-4 border-t border-white/10">
            <p className="text-xs text-sidebar-text/50">Mini CRM v1.0</p>
          </div>
        </aside>
        <main className="flex-1 ml-56 p-8 min-h-screen">{children}</main>
      </body>
    </html>
  );
}

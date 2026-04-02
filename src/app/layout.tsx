import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { TokenTracker } from "@/components/token-tracker";
import { VoiceControl } from "@/components/voice-control";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
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
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-text hover:bg-white/[0.06] hover:text-white transition-all text-[13px] font-medium group"
    >
      <span className="w-5 h-5 flex items-center justify-center text-[15px] opacity-60 group-hover:opacity-100 transition-opacity">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex">
        {session?.user ? (
          <>
            <aside className="w-[220px] bg-sidebar-bg flex flex-col fixed h-full border-r border-white/[0.06]">
              <div className="px-4 pt-5 pb-4">
                <Link href="/" className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 text-xs font-bold">M</span>
                  <span className="text-white font-semibold text-[15px] tracking-tight">Mini CRM</span>
                </Link>
              </div>

              <nav className="flex-1 px-2.5 overflow-y-auto">
                <NavSection label="Overview">
                  <NavLink href="/" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>} label="Dashboard" />
                  <NavLink href="/ai" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.57-3.25 3.92a1 1 0 0 0-.75.97V13"/><path d="M12 17v.01"/><path d="M8 21h8"/><path d="M12 17a5 5 0 0 0 5-5"/><path d="M12 17a5 5 0 0 1-5-5"/></svg>} label="AI Chat" />
                </NavSection>

                <NavSection label="Contacts">
                  <NavLink href="/persons" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} label="Persons" />
                  <NavLink href="/companies" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg>} label="Companies" />
                </NavSection>

                <NavSection label="Communication">
                  <NavLink href="/emails" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>} label="Emails" />
                  <NavLink href="/events" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>} label="Events" />
                </NavSection>

                <NavSection label="Productivity">
                  <NavLink href="/todos" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>} label="To-Dos" />
                  <NavLink href="/calendar" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>} label="Calendar" />
                  <NavLink href="/trash" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>} label="Trash" />
                </NavSection>
              </nav>

              <VoiceControl />
              <TokenTracker />
              <div className="px-3 py-3 border-t border-white/[0.06]">
                <Link href="/profile" className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
                  <span className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-[11px] font-semibold text-zinc-300">
                    {session.user.email?.[0]?.toUpperCase() || "U"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] text-zinc-400 truncate">{session.user.email}</span>
                  </span>
                </Link>
                <div className="flex gap-3 px-2 mt-1.5">
                  <Link href="/profile" className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
                    Settings
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/login" });
                    }}
                  >
                    <button
                      type="submit"
                      className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </aside>
            <main className="flex-1 ml-[220px] p-8 min-h-screen">{children}</main>
          </>
        ) : (
          <main className="flex-1">{children}</main>
        )}
      </body>
    </html>
  );
}

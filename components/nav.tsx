"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/enquiries", label: "Enquiries", icon: "M4 5h16v11H8l-4 4V5z" },
  { href: "/matching", label: "Matching", icon: "M8 7a3 3 0 100 6 3 3 0 000-6zM16 7a3 3 0 100 6 3 3 0 000-6zM3 20c.5-3 2.6-5 5-5s4.5 2 5 5M11 20c.5-3 2.6-5 5-5s4.5 2 5 5" },
  { href: "/connect", label: "Connect Claude", icon: "M12 3l1.6 6.1L19.5 6l-3.1 5.4L22 13l-6.1 1.6L19 20l-5.4-3.1L12 22l-1.6-6.1L5 20l3.1-5.4L2 13l6.1-1.6L5 6l5.4 3.1z" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex md:flex-col gap-0.5 overflow-x-auto">
      {items.map((it) => {
        const active = path === it.href || path.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-[13.5px] font-medium whitespace-nowrap transition-colors ${
              active ? "bg-white text-ink-950 shadow-card border border-line" : "text-ink-500 hover:text-ink-950 hover:bg-ink-950/[0.04] border border-transparent"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={it.icon} />
            </svg>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

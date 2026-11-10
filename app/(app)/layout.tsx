import Link from "next/link";
import { Nav } from "@/components/nav";
import { logout } from "@/app/actions";
import { ResetDemo } from "@/components/reset-demo";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r border-line bg-canvas px-3 py-3 md:py-5 flex md:flex-col gap-3 md:gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 shrink-0">
          <img src="/icon.svg" alt="" className="h-7 w-7" />
          <span className="font-display font-bold text-[16px] text-ink-950 hidden sm:inline">Roomie Desk</span>
        </Link>
        <div className="flex-1 min-w-0"><Nav /></div>
        <div className="hidden md:block px-2 space-y-3">
          <div className="rounded-xl border border-line bg-white p-3">
            <p className="text-[12px] font-medium text-ink-900">Demo workspace</p>
            <p className="text-[11.5px] text-ink-500 mt-0.5 leading-snug">All flatmate profiles here are fictional sample data.</p>
            <ResetDemo />
          </div>
          <form action={logout}><button className="text-[12.5px] text-ink-500 hover:text-ink-950">Sign out</button></form>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-8 max-w-[1200px]">{children}</main>
    </div>
  );
}

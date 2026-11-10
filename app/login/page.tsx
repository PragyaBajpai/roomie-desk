import { LoginForm } from "./form";
import { demoCredentials } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const creds = demoCredentials();
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 sm:px-16 py-12">
        <div className="max-w-sm w-full mx-auto">
          <div className="flex items-center gap-2 mb-10">
            <img src="/icon.svg" alt="" className="h-8 w-8" />
            <span className="font-display font-bold text-[18px]">Roomie Desk</span>
          </div>
          <h1 className="text-[26px] font-bold">Sign in to your desk</h1>
          <p className="text-ink-500 mt-1.5 mb-8">Enquiries, matching and shortlists for your co-living business.</p>
          <LoginForm next={next ?? "/dashboard"} />
          <div className="mt-6 rounded-xl border border-dashed border-line bg-white px-4 py-3 text-[12.5px] text-ink-500">
            <p className="font-medium text-ink-900 mb-1">Demo access</p>
            <p>Email: <span className="font-mono text-ink-900">{creds.username}</span></p>
            <p>Password: <span className="font-mono text-ink-900">{creds.password}</span></p>
          </div>
        </div>
      </div>
      <div className="hidden lg:flex flex-col justify-between bg-ink-950 text-white p-14 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl" />
        <p className="text-[13px] text-white/60 relative">Find your space. Find your people.</p>
        <div className="relative space-y-6 max-w-md">
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <p className="text-[12px] text-white/50 mb-2">You, in Claude</p>
            <p className="text-[15px] leading-relaxed">“New enquiry: female professional, Hinjewadi Phase 1, budget ₹12,000, vegetarian, moving by Dec 1. Find her three matches.”</p>
          </div>
          <div className="rounded-2xl bg-white p-5 text-ink-900">
            <p className="text-[12px] text-ink-500 mb-3">Roomie Desk, a second later</p>
            {[["Priya D.", 100], ["Ananya K.", 100], ["Sneha I.", 100]].map(([n, s]) => (
              <div key={n} className="flex items-center justify-between py-1.5 text-[13.5px]">
                <span>{n}</span>
                <span className="chip bg-sage-50 text-sage-700">{s}% match</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-[12px] text-white/40">Deterministic scoring · Postgres · Model Context Protocol</p>
      </div>
    </div>
  );
}

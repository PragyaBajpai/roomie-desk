import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await q1<{ e: number; f: number }>("SELECT (SELECT count(*)::int FROM enquiries) AS e, (SELECT count(*)::int FROM flatmates) AS f");
    return Response.json({ ok: true, database: "connected", enquiries: r?.e, flatmates: r?.f });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

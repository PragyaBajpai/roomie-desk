import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    MCP_ACCESS_KEY: Boolean(process.env.MCP_ACCESS_KEY),
  };
  try {
    const r = await q1<{ e: number; f: number }>("SELECT (SELECT count(*)::int FROM enquiries) AS e, (SELECT count(*)::int FROM flatmates) AS f");
    return Response.json({ ok: true, database: "connected", enquiries: r?.e, flatmates: r?.f, env });
  } catch (e) {
    // Message only (no connection string) so it's safe to show.
    return Response.json({ ok: false, error: (e as Error).message, env }, { status: 500 });
  }
}

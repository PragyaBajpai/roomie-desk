import { handleMcp } from "@/lib/mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const h = (req: Request) => handleMcp(req);
export { h as GET, h as POST, h as DELETE, h as OPTIONS };

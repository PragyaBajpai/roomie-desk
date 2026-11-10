import { handleMcp } from "@/lib/mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ctx = { params: Promise<{ key: string }> };
const h = async (req: Request, { params }: Ctx) => handleMcp(req, (await params).key);
export { h as GET, h as POST, h as DELETE, h as OPTIONS };

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "./mcp";
import { ensureReady } from "./db";

function baseUrl(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

/** Access key: path segment /api/mcp/<key> (for Claude connectors) or Authorization: Bearer <key>. */
export function authorised(req: Request, pathKey?: string) {
  const expected = process.env.MCP_ACCESS_KEY;
  if (!expected) return true; // open endpoint when no key is configured
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const given = pathKey ?? bearer ?? "";
  if (given.length !== expected.length) return false;
  let r = 0;
  for (let i = 0; i < given.length; i++) r |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return r === 0;
}

export async function handleMcp(req: Request, pathKey?: string) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!authorised(req, pathKey)) {
    return json(401, { jsonrpc: "2.0", error: { code: -32001, message: "Invalid or missing Roomie Desk MCP access key" }, id: null });
  }
  if (req.method !== "POST") {
    // Stateless server: no standalone SSE stream or sessions to delete.
    return json(405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. Use POST." }, id: null });
  }
  await ensureReady();
  const server = buildMcpServer(baseUrl(req));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

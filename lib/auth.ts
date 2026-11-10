// Minimal signed-cookie session. Works in Edge middleware and Node (Web Crypto).
export const SESSION_COOKIE = "roomie_session";
const MAX_AGE_S = 60 * 60 * 24 * 14;

function secret() {
  return process.env.AUTH_SECRET || "dev-only-insecure-secret";
}

const enc = new TextEncoder();

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(username: string) {
  const payload = `${encodeURIComponent(username)}.${Math.floor(Date.now() / 1000) + MAX_AGE_S}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token?: string | null): Promise<string | null> {
  if (!token) return null;
  // Format: <encodedUser>.<exp>.<sig> — the user part may itself contain dots.
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const sig = parts.pop()!;
  const exp = parts.pop()!;
  const user = parts.join(".");
  if (!safeEqual(sig, await hmac(`${user}.${exp}`))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return decodeURIComponent(user);
}

export function demoCredentials() {
  return {
    username: process.env.DEMO_USERNAME || "demo@roomie.app",
    password: process.env.DEMO_PASSWORD || "Roomie@2026",
  };
}

export const SESSION_MAX_AGE = MAX_AGE_S;

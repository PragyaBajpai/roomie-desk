/** Public base URL of the app, from APP_URL or the incoming request headers. */
export function baseUrlFrom(h: Headers) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const customerLink = (base: string, token: string) => `${base}/c/${token}`;

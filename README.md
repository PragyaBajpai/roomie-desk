# Roomie Desk

**Find your space. Find your people.**

Roomie Desk is a back-office tool for independent flatmate-matching agencies and small co-living operators. It replaces the spreadsheet-and-WhatsApp workflow for one job done well:

**Create enquiry → Find matching flatmates → Shortlist matches → Save results**

The owner can run that whole loop by talking to Claude (through a remote MCP server), then open Roomie Desk, see the exact records Claude created, edit them by hand and save.

> All flatmate profiles in the workspace are **fictional demo data**, labelled "Fictional demo" in the app and in every MCP response.

---

## What's in the box

| Screen | What it does |
|---|---|
| **Dashboard** | Total enquiries, pending enquiries, active flatmate profiles, shortlisted matches, pipeline by status, live activity feed (Claude actions marked "via Claude"). |
| **Enquiries** | List with status filters; create; full edit & save of customer name, phone, budget, location, move-in date, food/smoking/drinking, lifestyle preferences, notes and status. Shortlist follow-up status + notes per profile. |
| **Matching workspace** | Pick an open enquiry, see ranked flatmate profiles with a 0–100 score and a per-criterion breakdown, shortlist / un-shortlist with one click. |
| **Connect Claude** | The MCP URL with copy button, setup steps and sample prompts. |
| **Customer link** (`/c/<token>`) | No login. The customer sees only their own requirements and shortlist (no internal notes, phone or other customers) and can **Accept** or **Not for me**. |

### Matching (deterministic — no AI in the app)
`lib/matching.ts`. Hard filters first (active profile, flatmate gender, city, and the flatmate's own gender preference must accept the seeker), then:

| Criterion | Weight | Full marks when… | Partial credit |
|---|---|---|---|
| Budget | 30 | Flatmate's budget range overlaps the enquiry's | Linear fall-off, zero once 25% outside |
| Location | 25 | Same locality (normalised: "Ph 1" = "Phase 1"), or inside a broader requested area | 15 adjacent area (e.g. Phase 2 vs Phase 1), 7 same city |
| Move-in | 20 | Moves in on/before the enquiry's date | 14 ≤7 days late, 10 ≤14, 5 ≤30 |
| Food | 10 | Compatible (vegan fits vegetarian, etc.) | 5–6 near-misses |
| Lifestyle | 15 | 5 smoking + 5 drinking + 5 lifestyle-tag overlap | Clashes (early-riser vs night-owl) deduct |

Every result carries a plain-English reason per criterion, which is what Claude reads back to the user.

### Who decides a match
- **Admin (agency):** one login, sees and edits everything. Each enquiry has a private **customer link** to send on WhatsApp; Claude's `get_enquiry`/`create_enquiry` return it as `customer_link`.
- **Customer:** opens the link and accepts or passes. Recorded as **Accepted by customer** / **Declined by customer**.
- If the customer confirms by phone, the admin (or Claude via `update_enquiry_status` + `matched_flatmate_id`) can record it — always labelled **Confirmed by agency**, on the admin view, the customer's page and in MCP results.
- One accepted match per enquiry. No customer registration or passwords — the link is a random 24-character token.

### Matched profiles leave the pool
A shortlist doesn't reserve anyone — the same profile can be sent to several seekers, and match cards show **"Also shortlisted for …"** so you can see the overlap. When a customer agrees, set that shortlist entry to **Accepted** (or tell Claude "mark Neha as matched with Priya"): the enquiry becomes *matched*, the flatmate becomes *matched*, and they disappear from every other enquiry's results and can't be shortlisted elsewhere. Moving the entry or the enquiry back releases them.

### MCP server
Official `@modelcontextprotocol/sdk`, **Streamable HTTP** (stateless, JSON responses) at `/api/mcp/<MCP_ACCESS_KEY>`.

| Tool | Database operation |
|---|---|
| `create_enquiry` | INSERT enquiry |
| `update_enquiry` | UPDATE enquiry fields, re-score its shortlist |
| `get_enquiry` | SELECT enquiry + shortlist |
| `search_flatmates` | SELECT active profiles → filter → score → rank (by `enquiry_id` or direct criteria) |
| `get_flatmate_details` | SELECT profile (+ score breakdown against an enquiry) |
| `shortlist_flatmate` | UPSERT shortlist rows with stored score + reason; enquiry → "shortlisted" |
| `get_shortlisted_flatmates` | SELECT shortlist with scores, reasons, notes, status |
| `update_enquiry_status` | UPDATE status (new → matching → shortlisted → contacted → matched → closed) + note. With `matched_flatmate_id`, accepts that flatmate and takes them out of the pool. |

Inputs are validated with zod (schemas exposed to Claude); errors come back as `isError` results with a readable message; every write is logged to the activity feed with `source = claude`.

**Auth:** the access key is part of the URL path (works with Claude's "No sign in" connector option). Alternatively use `/api/mcp` with header `Authorization: Bearer <MCP_ACCESS_KEY>`. If `MCP_ACCESS_KEY` is unset the endpoint is open — don't do that in production.

### Stack
Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS · PostgreSQL via `pg` · `@modelcontextprotocol/sdk` · zod. One deployable app: UI, API and MCP server share the same database code.

---

## Deploy (Vercel + Neon Postgres, free tiers)

1. **Push this repo to GitHub.**
2. **Vercel** → *Add New → Project* → import the repo. Framework is detected as Next.js. Don't deploy yet.
3. In the project, **Storage → Create Database → Neon (Postgres)** → connect it to the project. This sets `DATABASE_URL` automatically. (Or create a database at neon.tech and paste its *pooled* connection string as `DATABASE_URL`.)
4. **Settings → Environment Variables** — add:
   - `DEMO_USERNAME` = `demo@roomie.app`
   - `DEMO_PASSWORD` = `Roomie@2026`
   - `AUTH_SECRET` = a long random string
   - `MCP_ACCESS_KEY` = a long random string (this goes in the MCP URL)
5. **Deploy.** Open `https://<your-app>.vercel.app/api/health` → `{"ok":true,"database":"connected",…}`.

### Database setup
Nothing to run by hand. On the first request the app creates its tables (`lib/schema.ts`, idempotent, guarded by a Postgres advisory lock) and loads the fictional demo data once (`lib/seed.ts`: 12 flatmates, 3 enquiries). To reset the demo, sign in and click **Reset demo data** in the sidebar (restores the original fictional data; all changes and customer links are replaced).

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` (or `POSTGRES_URL`) | yes | Postgres connection string. SSL is used automatically for non-local hosts. |
| `AUTH_SECRET` | yes | Signs the session cookie (HMAC-SHA256). |
| `DEMO_USERNAME` / `DEMO_PASSWORD` | yes | The single demo login. |
| `MCP_ACCESS_KEY` | yes | Secret in the MCP URL path / bearer token. |
| `APP_URL` | no | Base URL for links returned to Claude. Auto-detected from the request. |

---

## Connect Claude

1. In Claude (web or desktop): **Customize → Connectors → + Add → Add custom connector**.
2. Name: `Roomie Desk`. URL: `https://<your-app>.vercel.app/api/mcp/<MCP_ACCESS_KEY>`.
3. Authentication: **No sign in**. Click **Add**.
4. In a new chat enable Roomie Desk from the tools menu, then try:

> I have a new enquiry from Neha Kapoor, a female working professional looking for a flatmate in Hinjewadi Phase 1, Pune. Her budget is ₹12,000, she prefers vegetarian food and wants to move in by December 1. Create the enquiry and find her the best three matches.

> Shortlist all three for her and add the note "Share profiles on WhatsApp today".

> What's on Neha's shortlist right now?

> Update Neha's budget to ₹13,000 and mark the enquiry as contacted.

Then log in at `https://<your-app>.vercel.app` (demo@roomie.app / Roomie@2026) → the enquiry is on the dashboard with a "via Claude" badge → open it, edit, **Save changes**, refresh.

Custom connectors are available on all Claude plans (Free is limited to one). Docs: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp

---

## Local development

```bash
npm install
cp .env.example .env.local   # point DATABASE_URL at a local Postgres
npm run dev
```

### Tests
`npm run test:mcp -- <MCP URL>` runs the whole Claude journey against any deployment using the official MCP client: lists the 8 tools, creates the assignment's enquiry, searches (asserts 3 female-only, explained matches), shortlists, checks idempotency, updates, changes status, and checks validation + not-found errors.

---

## Project layout

```
app/(app)/dashboard        Dashboard
app/(app)/enquiries        List, new, detail/edit + shortlist
app/(app)/matching         Matching workspace
app/(app)/connect          Claude connection page
app/api/mcp/[key]          Remote MCP endpoint (Streamable HTTP)
app/api/health             DB health check
app/actions.ts             Server actions for the UI
lib/matching.ts            Deterministic scoring engine
lib/repo.ts                All database reads/writes (shared by UI and MCP)
lib/mcp.ts                 MCP tool definitions
lib/schema.ts, lib/seed.ts Schema + fictional demo data
scripts/mcp-e2e.mjs        End-to-end MCP test
```

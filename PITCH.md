# Roomie Desk: 5-minute pitch script

The brief's format is 5 sections and 5:00 maximum; longer videos aren't watched. **Aim for 4:40.** Words in *italics* are what you say. Numbers marked *(assumption)* are not validated: say "we estimate" on camera.

| # | Section | Time | Ends at |
|---|---|---|---|
| 1 | Who you are | 0:40 | 0:40 |
| 2 | Your best work | 0:25 | 1:05 |
| 3 | Why this business will win | 0:55 | 2:00 |
| 4 | Demo | 2:00 | 4:00 |
| 5 | The money | 0:40 | 4:40 |

---

## 1 · Who you are (0:40)

*"Hi, I'm Pragya. I'm a product manager with six years in tech: three in product, and before that, engineering in Python, Django and REST APIs.*

*Today I'm an Associate Project Manager for AI products at Partex.ai, where I own end-to-end delivery of an enterprise client's AI product: PRDs, LLM workflows, output validation, UAT and releases. Before that I was at Linarc, building enterprise B2B SaaS for construction.*

*So I sit right where this assignment sits: business workflows, integrations, and AI that has to work in production. This is Roomie Desk."*

## 2 · Your best work (0:25)

Every fact here is true and checkable. Don't add numbers you can't back up in an interview.

*"The thing I'm proudest of is at Linarc. I led Schedule of Values, the billing backbone of a construction project, end to end, and connected it to two systems contractors already lived in: DocuSign for signing and QuickBooks for accounting. Contractors could take a project's billing from schedule to signed contract to synced invoice without leaving the product, where before it meant spreadsheets and re-typing.*

*And the most recent proof is the product you're about to see: I took Roomie Desk from idea to live in under 24 hours, with eight working Claude tools, a real database, and automated tests on every flow."*

> **If you can find a real figure** (your CV, an old sprint report, a LinkedIn post), drop it into the Linarc sentence. For example: *"…rolled out to [N] customer accounts"* or *"…cut billing prep from [X] to [Y]"*. If not, use the script as written.

## 3 · Why this business will win (0:55)

**Who it's for.** *"Independent flatmate-matching agencies and small co-living operators: the people placing IT professionals and students in Pune, Bengaluru and Hyderabad."*

**The problem.** *"They run on WhatsApp and spreadsheets. Every enquiry means re-typing budget, area, move-in date and food preferences, scrolling a sheet for compatible people, and forgetting who was sent to whom. Slow replies lose the lead."*

**Why an app, and not just Claude.** *"Claude is brilliant at understanding a messy WhatsApp enquiry, but on its own it can't run the business:*
- *It has no shared, permanent record: the agency's staff all need the same pipeline, tomorrow and next month.*
- *The customer doesn't use the agency's Claude. Roomie Desk gives the customer a private link to see their matches and accept. That keeps working after the chat ends.*
- *Matching has to be consistent and defensible, so Roomie Desk scores it with fixed rules: budget, location, move-in date, food and lifestyle, with a reason for every point. No AI inside.*

*Claude does the thinking and writing. Roomie Desk keeps the records, does the maths, and serves the customer."*

## 4 · Demo (2:00)

**Before you hit record**
- Log in to Roomie Desk → sidebar → **Reset demo data** (clean slate; Neha will be enquiry #4).
- New Claude chat with the **Roomie Desk** connector switched on. Run one throwaway prompt first ("list Riya Sharma's enquiry") so any tool-permission prompts are already approved.
- Tabs ready: Claude | Roomie Desk dashboard | a private/incognito window (or your phone) for the customer link.
- Browser zoom 110–125%.

| Time | Do | Say |
|---|---|---|
| 0:00 | Paste in Claude: **"I have a new enquiry from Neha Kapoor, a female working professional looking for a flatmate in Hinjewadi Phase 1, Pune. Her budget is ₹12,000, she prefers vegetarian food and wants to move in by December 1. Create the enquiry and find her the best three matches."** | *"This is exactly how an agency owner would type it."* |
| 0:15 | Point at the tool calls `create_enquiry` → `search_flatmates`, then the three matches. | *"Claude created a real enquiry in my database and searched it. The scores come from Roomie Desk, not from Claude, and each one has a reason. These are fictional demo profiles."* |
| 0:35 | Type: **"Shortlist all three and add the note 'Share profiles on WhatsApp today'."** | *"Saved."* |
| 0:45 | Switch to the dashboard and refresh. | *"Here's Neha: created via Claude, three shortlisted, and the activity feed shows exactly what Claude did."* |
| 1:00 | Open Neha. Change budget to **13,000**, tick **quiet**, status **Contacted**, **Save changes**. Then **refresh the page**. | *"A person can correct anything Claude did. Saved, refreshed, still there: it's in Postgres."* |
| 1:25 | Copy the **Customer link**, open it in the private window or on your phone. Click **Accept Priya**. | *"This is what Neha sees: no login, only her own matches. She accepts Priya herself."* |
| 1:40 | Back to admin, refresh: **Accepted by customer**, enquiry **Matched**. Open **Matching** for Riya: Priya is gone. | *"The agency sees who decided, and Priya is off the market for everyone else."* |
| 1:50 | In Claude: **"What's Neha's status and budget now?"** | *"And Claude sees my manual edit and Neha's decision. Claude, the app, the agency and the customer, all on one record."* |

## 5 · The money (0:40)

**Cost to run, per customer.** *"Roomie Desk has no AI bill: the agency's own Claude plan does the AI work. My only cost is hosting: one shared app and database. On paid tiers that's about ₹3,500 a month in total, so at 100 agencies it's roughly ₹35 per customer per month. (assumption)"*

**What we charge.** *"Free for up to 20 enquiries a month. Starter at ₹499 and Pro at ₹999 a month for unlimited enquiries and team seats. That's over 95% gross margin, and one placement fee usually covers a year of Pro. (assumption)"*

**First 100 customers.** *"These agencies are easy to find: they advertise in Facebook flatmate groups, on NoBroker, OLX and Instagram, around Pune and Bengaluru's IT parks. I'd personally onboard the first 20, offer free setup, then grow through referrals and broker WhatsApp communities. About six months to 100. (assumption)"*

**1 year / 3 years.** *"In a year: around 300 paying agencies in 3 cities, about ₹30 lakh ARR, adding viewing scheduling and WhatsApp-sent links. In three years: 10 cities and around 3,000 agencies, and then the bigger prize: collecting deposits and rent through the platform, taking a small cut of the money that already flows through every placement. (assumption)"*

*"Roomie Desk: find your space, find your people. Thank you."*

---

### Recording checklist
- [ ] Reset demo data right before recording
- [ ] Throwaway prompt run, so tool permissions are already approved
- [ ] One full dry run with a timer: under 4:50
- [ ] After recording: **Reset demo data** again, so reviewers start clean
- [ ] Upload (YouTube unlisted / Loom / Google Drive "anyone with link") and test the link in a private window

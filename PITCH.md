# Roomie Desk — 5-minute pitch script

Target: 4:30. Timings are cumulative. Numbers marked *assumption* are not validated market data — say so on camera.

---

## 0:00 – 0:30 · Who I am
- Your name, background, and one line on why this problem: e.g. "I've seen friends spend weeks finding a flatmate through WhatsApp groups, and the agencies in the middle are drowning in the same chaos."
- "In the next five minutes: the problem, the product, a live demo, and the economics."

## 0:30 – 1:15 · The problem
- Small flatmate-matching agencies and co-living operators in cities like Pune and Bengaluru run on **WhatsApp + spreadsheets + phone calls**.
- Every enquiry means re-typing the same details (budget, area, move-in date, food, lifestyle), scrolling a sheet to find compatible people, and forgetting who was sent to whom.
- The cost: slow replies lose the lead; inconsistent matching produces bad pairings; nothing is measurable.
- These operators won't adopt a heavy CRM. They already live in a chat window.

## 1:15 – 1:45 · The product
- **Roomie Desk**: one workflow done well — *enquiry → matches → shortlist → saved*.
- The operator talks to Claude like they'd talk to an assistant; Claude calls Roomie Desk's MCP server, which does the real work in a real database.
- The split is deliberate: **Claude handles language, the app handles truth** — storage, a deterministic, explainable score (budget 30, location 25, move-in 20, food 10, lifestyle 15), and editing. No AI key in the product, no black-box scores.

## 1:45 – 3:45 · Live demo (screen recording)
Have Claude open with the Roomie Desk connector enabled, and the app logged in on a second tab.

1. **Claude** — paste: *"I have a new enquiry from Neha Kapoor, a female working professional looking for a flatmate in Hinjewadi Phase 1, Pune. Her budget is ₹12,000, she prefers vegetarian food and wants to move in by December 1. Create the enquiry and find her the best three matches."*
   - Point out the tool calls (`create_enquiry`, `search_flatmates`) and the per-criterion reasons. Mention profiles are fictional demo data.
2. **Claude** — *"Shortlist all three and note 'Share profiles on WhatsApp today'."* (`shortlist_flatmate`)
3. **App** — refresh the Dashboard: new enquiry with the **via Claude** badge, activity feed shows Claude's actions.
4. **App** — open the enquiry: the three shortlisted profiles with stored scores. Change the budget to ₹13,000, add a lifestyle tag, set status to *Contacted*, **Save**. **Refresh the page** — it persisted.
5. **App** — Matching workspace: show the score breakdown bars; shortlist one more by hand.
6. **Claude** — *"What's on Neha's shortlist now and what's her budget?"* → Claude reads back the human's edit. That closes the loop: Claude → MCP → database → human edit → Claude sees it.

## 3:45 – 4:30 · Business economics (*assumptions*)
- **Pricing (proposed):** Free (limited enquiries) · Starter ₹499/month · Pro ₹999/month.
- **Unit economics:** single shared Next.js + Postgres deployment; marginal hosting cost per customer is a few rupees a month at small scale → gross margin comfortably above 90% (*assumption*). No AI inference cost on our side — the customer brings their own Claude.
- **Value anchor:** one placement fee for an agency is typically worth more than a year of Pro (*assumption — validate in interviews*). Saving even one lost lead a month pays for it.
- **Go-to-market:** founder-led sales to agencies already visible on Facebook/WhatsApp groups and NoBroker-style listings in Pune and Bengaluru; then co-living operators with 20–200 beds.
- **Next metrics to validate:** time-to-first-reply per enquiry, enquiry → shortlist conversion, weekly active operators.

## 4:30 – 5:00 · Why it wins
- Meets operators where they already work — a chat box — instead of asking them to learn a CRM.
- Explainable, deterministic matching they can trust and defend to a customer.
- Every action becomes structured data, so the business finally gets a pipeline.
- Close: "Roomie Desk — find your space, find your people. Thank you."

---

### Recording checklist
- Log in beforehand; have the connector enabled in a fresh Claude chat.
- Zoom browser to 110–125% so text is legible.
- If a tool call asks for permission, click "Allow" — it shows the integration is real.

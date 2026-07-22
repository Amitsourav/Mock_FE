# Dashboard changes — PLAN (not implemented yet)

> Status: **planning only.** Nothing here is built until you say "implement".
> Scope so far: the analytics **Dashboard** tab (`components/app/dashboard/DashboardView.tsx`)
> and its pieces. More tasks will be appended as you list them.

---

## Task 1 — Attempt history opens inline, no separate page

**What you want:** In "Attempt history", clicking one of my attempts currently **replaces the
whole dashboard** with a separate detail view (feels like a new page). Instead, the attempt's
breakdown should open **on the same page (the main dashboard)** — everything stays on one page.

**How it works today**
- `DashboardView.tsx` holds `openAttempt` state.
- Near the top of the render: `if (openAttempt) return <AttemptDetail … onBack={() => setOpenAttempt(null)} />;`
  → this early-return **swaps out the entire dashboard** for `AttemptDetail`.
- `AttemptDetail.tsx` is self-contained (loads `getAttemptDetail`, shows title/meta, AI
  "InsightBlock", section + skill breakdowns, `QuestionGrid`) and has a **"Back to dashboard"**
  button wired to `onBack`.

**Plan**
- **Remove the early-return** `if (openAttempt) return <AttemptDetail … />`.
- Render `AttemptDetail` **inline inside the "Attempt history" section**: keep `AttemptsList`
  visible; when `openAttempt` is set, render `<AttemptDetail … />` **directly below the list**
  (both on the dashboard, no navigation).
- Repurpose its button from **"Back to dashboard" → "Close"** (it now just collapses the inline
  detail via `setOpenAttempt(null)`), since we never leave the dashboard. Small edit in
  `AttemptDetail.tsx` (relabel; behaviour unchanged) or pass a label prop.
- Nice-to-have: smooth-scroll the newly opened detail into view; allow only one open at a time
  (clicking another attempt swaps which detail shows).
- Files: `components/app/dashboard/DashboardView.tsx` (main change), tiny relabel in
  `components/app/dashboard/AttemptDetail.tsx`.

**Decision to confirm:** when an attempt opens, should the list **stay above** the detail
(both visible) or **collapse** so only the detail shows within the section? (default: list stays
above, detail expands below.)

---

## Task 2 — "All numbers" section shown at the top

**What you want:** The **"All numbers"** section (raw stat grid) should be **at the top** of the
dashboard, not at the bottom.

**How it works today**
- It's the **last** section (§8) in `DashboardView.tsx`, a **collapsed `<details>`** ("All
  numbers") holding the 8 `StatTile`s: Mocks taken, Average score, Best score, Average accuracy,
  Latest percentile, Improvement, Time practised, First accuracy.

**Plan**
- **Move** the "All numbers" block to the **top** of the dashboard (first block in the returned
  list).
- Since you want it *shown*, render it as a **visible stat grid** (drop the collapsed
  `<details>`, or keep a header but expanded), so the numbers are visible at the top.
- Files: `components/app/dashboard/DashboardView.tsx` only (reorder + un-collapse).

**Decisions to confirm:**
- Position: **above the Readiness hero**, or **just below the hero** (hero stays the visual
  centrepiece)? (default: just below the hero.)
- The hero already shows Predicted score · Latest percentile · Mocks · Improvement — the grid
  repeats a few. OK to keep the full 8-tile grid, or trim the duplicates? (default: keep all 8.)

---

## Resulting dashboard order (after Tasks 1 & 2, defaults)
Readiness hero → **All numbers (top, visible)** → Fix these first → Trajectory → How you test →
Attempt history (**with inline detail**). *(Your coach's read & Skill map remain hidden.)*

---

## Task 3 — Leaderboard

**What you want:** Add a **leaderboard** to the dashboard.

**Plan (frontend):** a `Leaderboard` panel/section — a ranked list (rank · student · score or
percentile) with **the current user's row highlighted**, likely scoped to their exam/stream,
e.g. top 10 + a "your rank" row. Fetch on load; empty/loading/error states like other panels.

**🔴 Backend needed:** there is **no leaderboard endpoint today**. Need a new one, e.g.
`GET /dashboard/leaderboard` (optionally `?scope=stream`), returning ranked entries **and** the
current user's rank/position.
**Decisions to confirm when we build:**
- Ranking metric — best score? average percentile? latest percentile?
- Scope — per exam/stream, or global?
- Privacy — real names, first-name only, or anonymised ("You" + masked handles)?
- Timeframe — all-time vs this week/month?

---

## Task 4 — Share feature (share dashboard + a single exam report)

**What you want:** Let a student **share** their dashboard, and share a **single exam report**.

**Plan — two possible approaches (pick when we build):**
- **(a) Shareable link (public read-only view).** 🔴 **Backend needed:** create-share-link
  endpoint (returns a token/URL) + a **public read-by-token** endpoint that serves the
  dashboard/attempt data **without auth**; plus a **new public frontend route**
  (e.g. `/share/[token]`) rendering a read-only version. Most powerful, most work + privacy care.
- **(b) Share an image / file (no backend).** "Share" produces an image or PDF (ties into
  Task 5) and uses the OS share sheet / copy-link-to-file. 🟢 Mostly frontend.

**Decision to confirm:** link-based (backend) vs image/file-based (frontend-only).

---

## Task 5 — Download report as PDF (dashboard + any single exam report)

**What you want:** **Download** the dashboard report as **PDF**, and any single exam report as PDF.

**Plan (frontend, mostly):** a "Download PDF" button on the dashboard and on each attempt report.
Client-side generation — either a **print stylesheet + `window.print()`** (lightest, no dep) or a
**new dependency** (e.g. `html2canvas` + `jsPDF`, or `@react-pdf/renderer`) for a designed PDF.
Needs a **print-friendly layout** so the PDF looks clean.

- 🟢 Client-side PDF = **no backend**.
- 🟡 Optional 🔴 backend if we want **server-generated PDFs** (higher fidelity, but more work).

**Decision to confirm:** `window.print()` vs a PDF library (adds a dependency); client-side vs
server-side.

---

## Task 6 — Predict German college from dMAT score  ⚠️ (you have your own plan)

**What you want:** From the dMAT score, **predict which college the student can get in Germany.**

**⚠️ IMPORTANT — you said:** *"this one is complicated, I already made that plan. When we start
implementing, remind me — I'll tell you the plan."*
→ **At implementation time I will ASK you for your plan for this before building anything.**

**Likely shape (until your plan lands):** 🔴 **Backend needed** — a prediction endpoint and/or a
**college dataset with cut-offs** mapping score → eligible colleges. Frontend renders the
predicted colleges as a dashboard section. Details TBD from your plan.

---

# ⚠️ REMINDERS — read this before we start implementing

1. **Task 6 (college prediction):** ask the user to share **their existing plan** first — do not
   design it from scratch.
2. **Backend work is required for several tasks — surface this to the user before building:**
   - **Leaderboard** — new ranked endpoint (`GET /dashboard/leaderboard`) + current user's rank.
   - **Share (if link-based)** — create-share-link endpoint + public read-by-token endpoint
     (no auth) + a public `/share/[token]` route.
   - **PDF** — none if client-side; server-side optional.
   - **College prediction** — endpoint + college/cut-off data (per the user's plan).
3. **Confirm the per-task decisions** noted above (ranking metric, share approach, PDF method,
   list-stays-vs-collapses, All-numbers position) before coding.
4. **New dependency check:** PDF may add a library — confirm before installing.

---

# ★ COMPLETE DASHBOARD REDESIGN — reference synthesis + direction (HANDOFF NOTE)

> Goal: a **premium, "₹5-lakh-worth" analytics dashboard** for the dMAT mock platform.
> Method: **take the best of each reference — do NOT copy any one.** Build on our real data +
> the 6 feature tasks above. Keep our design tokens + light/dark; lift ideas, not pixels.
>
> **Raw screenshots:** the macOS temp files were auto-deleted before I could copy them to disk,
> so they are NOT saved on disk. Their full analysis is below (that's what a design plan needs).
> If you want the raw PNGs preserved, re-share them and I'll save them immediately.

## What each reference does best (deep element map — steal these, skip the rest)
1. **ref-1 · iQuanta CAT** — STRUCTURAL BACKBONE (same domain).
   ✅ Hero trio: score **gauge** (red→amber→green arc) + **All-India Rank on a DARK card**
   (trophy moment) · ✅ **section mini-gauges** as dark cards (→ our dMAT modules) ·
   ✅ overall-vs-section **comparison table** (dark header row) · ✅ **Weak/Moderate/Strong
   spots** chip clusters (= our Learn/Revise data) · ✅ **Performance tabs** (Score Card /
   Question-wise / Topic-wise / Difficulty-wise) — one container, many lenses.
   ❌ Skip the ad-like mid-band banners (that's what cheapens it).
2. **ref-2 · Financial bento** — THE PREMIUM POLISH.
   ✅ **Bento rhythm**: mixed-size rounded cards on one soft bg · ✅ ONE warm accent on calm
   neutrals · ✅ oversized numerals + air · ✅ the **dark "coin" ring card** (36%) as a focal
   point inside a light grid · ✅ concentric-circles composition chart.
   ❌ Skip the chat/assistant band.
3. **ref-3 · Crextio HR** — HIERARCHY + NUMBER CONFIDENCE.
   ✅ **Giant boxless KPI row** (78 · 56 · 203 + tiny icons) — this is how "All numbers on top"
   should look (a number STRIP, not 8 tiles) · ✅ **tick-mark progress ring** (gauge language for
   readiness) · ✅ bar chart with only the current bar coloured · ✅ ONE dark card per region
   (Onboarding 2/8) · ✅ segmented labelled progress bar.
4. **ref-4 · Twisty** — CHART CRAFT.
   ✅ **Lollipop trend**: thin stems, dot heads, ONE highlighted stem with a dark tooltip pill +
   day chips (active chip dark) — replaces our TrendChart look · ✅ big **delta + plain-language
   sentence** ("+20% — higher than last week") for improvement · ✅ **funnel row** (64 → 12 → 10
   with tick-bars) · ✅ **expandable rows with status pills + tag chips** → attempt-history rows.
5. **ref-5 · Check Box (dark)** — ENERGY + CONTROLS.
   ✅ **Filter bar** (Date/Product/Profile → our Exam/Timeframe) · ✅ **▲/▼ delta triangles** on
   every number · ✅ capsule timeline (attempts across dates).
   ⚠️ Dark = accent theme, not default (keep light-first + OS dark).
6. **ref-6 · IELTS LMS** — THE TASK-1 ANSWER.
   ✅ **Inline/slide-in DETAIL PANEL** (identity header → status pills "Good"/"On time" → metric
   blocks each with a mini-chart) = how one attempt opens INSIDE the dashboard ·
   ✅ **donut with counts legend** (28/32 On time/Late/Absent) for our error types ·
   ✅ **status-badged charts** ("Stable") — tiny AI verdict chips.

## Craft rules (what makes it read ₹5–10L)
- Bento radii + soft shadows; generous whitespace; nothing heavy or full-bleed grey.
- Exactly **one dark focal card per screen region** (rank / next-step), everything else light.
- Numbers HUGE in the display face (Fraunces), labels tiny; boxless KPI strip.
- **Selective colour**: neutral by default; accent only on the active/highlighted element.
- ▲/▼ deltas beside numbers; status pills on charts; counts-style donut legends.
- One orchestrated load: gauge draws + numbers count up (we already have this language).

## Proposed direction for OUR dashboard (bento, our data, houses the 6 features)
- **Header:** exam + student, **filters** (exam/timeframe, ref-5), and **actions** — Share
  (Task 4) + Download PDF (Task 5).
- **Hero bento row:** big **readiness/score gauge** (predicted score + band) [ref-1/2] · **Rank
  card** that opens the **Leaderboard** (Task 3) [ref-1] · **KPI tiles** (mocks · accuracy ·
  percentile · questions · time) as big numbers [ref-3] — this **is "All numbers", now at the top**
  (Task 2).
- **Section/subject performance:** per-dMAT-module mini-gauges + a compact comparison table
  [ref-1]. *(Data note below.)*
- **Trajectory:** lollipop/line trend with the **improvement %** celebrated + tooltip [ref-4].
- **Fix these first:** weak/strong concept "spots" with chips + our mastery rings [ref-1 + our
  ReadyToFix].
- **How you test:** error-type donut with legend + **status badges** [ref-6].
- **Attempt history → inline detail (Task 1):** expandable rows; opening one reveals an **inline
  DETAIL PANEL** (per-section mini-metrics + Good/Stable badges + mini charts) on the **same page**
  [ref-6] — no navigation.
- **College prediction (Task 6):** a dedicated card/section — **built to YOUR plan** (ask first).
- **Aesthetic:** rounded bento cards, generous whitespace, ONE confident accent (keep brand blue
  or introduce a warm accent — *decision*), Fraunces display headings, gauge/ring + lollipop
  charts, status badges; full **light + dark**.

## Backend flags for the redesign (surface before building)
- Everything in the "⚠️ REMINDERS" section above (leaderboard, share, college prediction), PLUS:
- **Dashboard-level section/subject summary** (ref-1's VARC/LRDI/QUANT table): today section
  data exists only **per-attempt** (`AttemptDetail.sections`). A dashboard-wide per-module
  aggregate likely needs a **new backend aggregate** (or we derive an approximation client-side
  from attempts/skills/concepts). Confirm.

## Open decisions for the redesign
- Accent: keep **brand blue**, or move to a **warm accent** (orange/amber) like refs 2–4?
- **Dark theme** emphasis (ref-5) — make dark a first-class look, or keep light-first?
- Section-wise data — wait for a backend aggregate, or derive client-side for now?

---

## More tasks
_(to be added as you list them)_

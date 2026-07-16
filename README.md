# dMAT Mock — Registration UI

Phone-OTP onboarding for the dMAT mock examination. Three screens: enter number →
verify code → register (or "you're already registered"). No dashboard, no exam UI.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key — **browser-safe** |
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL (`http://localhost:8000` locally) |

Only the publishable key belongs here. `NEXT_PUBLIC_*` is compiled into the client
bundle, so the service-role key and JWT secret must never appear in `.env.local`.

## How it works

`app/page.tsx` is a state machine over `boot → phone → otp → profile | done`.
Auth is Supabase phone OTP from the browser; `supabase-js` owns session storage
and refresh, so nothing here touches `localStorage` or the token directly.

`GET /me` is the single branch point: `profile_completed: false` shows the form,
`true` goes straight to the "already registered" screen. A returning user is never
asked to re-register. Any `401` clears the session and returns to the phone screen.

```
app/page.tsx          flow state machine
app/globals.css       design tokens (light/dark) + motion
components/           Card, Button, TextField, OtpInput
components/steps/     PhoneStep, OtpStep, ProfileStep, DoneStep
components/ui/        shadcn-structured: auth-layout (split screen), typewriter
lib/api.ts            typed fetch + Bearer + ApiError (401 → re-auth)
lib/supabase.ts       browser client (the only token access point)
lib/phone.ts          E.164 build/parse/validate, country list
lib/authErrors.ts     Supabase/Twilio errors → human sentences
```

## Design notes

**Two blues, not one.** `--brand` is interactive *text* (contrasts with the
surface behind it); `--brand-fill` is a CTA *background* (contrasts with the white
on top). One colour can't do both at WCAG AA — Apple's dark-mode `#0A84FF` gives
white text only 3.65:1. Hover *darkens*; lightening drops white under 4.5:1.

**shadcn compatibility.** `components.json` is configured, and the shadcn token
names (`--background`, `--primary`, `--border`, …) are aliased onto our palette in
`globals.css`, so anything added via `npx shadcn add …` inherits this design
instead of introducing a second one. Note shadcn's `--accent` is a muted hover
*surface*, which is why our brand blue is called `--brand` and not `--accent`.

**Adding a country.** Append to `COUNTRIES` in `lib/phone.ts`. Validation,
formatting and E.164 parsing all derive from that list.

**The exam showcase is hardcoded, and has to be.** The brand panel rotates
through exams in `lib/exam-showcase.ts`, not from `GET /exams` — that endpoint
requires a Bearer token, and the panel renders on the *pre-auth* login screen
where there is no session. Nothing in that file is the backend's exam list.

Two consequences worth knowing before you touch it:

- It currently advertises exams `/exams` does not yet return. That was a
  deliberate product call; the file header says so. Re-confirm it at launch.
- The copy is marked **DRAFT** and every volatile exam fact carries a
  `TODO(content-review)`. The dMAT entry is verified against
  [d-mat.de](https://www.d-mat.de/en/) and [aps-india.de](https://aps-india.de/dmat/)
  as of 2026-07-16 — its 2026 dates expire and need re-checking each intake.

**The card wall's 15 is load-bearing.** The marquee is 3 columns x 5 cards and
its seamless loop shifts by exactly one copy height (5 x 140px = 700px). The
`Cards15` tuple type makes a wrong count a compile error rather than a silently
torn animation. Changing card height or gap means changing `COPY_HEIGHT` in
`components/ui/exam-card-wall.tsx`.

**One clock drives the panel.** `useTypewriterCycle` (in
`components/ui/typewriter.tsx`) owns the rotation; the eyebrow, tagline and card
set all key off its `index`, so they cannot drift apart. `<Typewriter>` is a thin
wrapper over the same hook, so its API is unchanged.

## Scope

The registration journey only. Sign-in is phone OTP — there is no password or
Google flow, and the backend exposes no endpoint for either.

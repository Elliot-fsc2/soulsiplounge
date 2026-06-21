# AGENTS.md — Booking & Contact Management System

**Soul Sips Lounge** — Boracay, Philippines. Single-room booking + contact management SPA.

## Stack

- React 19 + Vite 7 + Tailwind CSS v4 + TypeScript 5.9
- npm (package manager)
- Framer Motion, clsx, tailwind-merge
- Supabase (optional — falls back to localStorage)
- `vite-plugin-singlefile` inlines all JS/CSS into `dist/index.html` on build

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Build to `dist/` (single self-contained HTML) |
| `npm run preview` | Serve `dist/` locally |

No test, lint, or format commands exist.

## Architecture

- **Monolithic single-file:** All components in `src/App.tsx` (2124 lines). View switching via `useState<View>` — no React Router.
- **Entry:** `index.html` → `src/main.tsx` → `<App />`
- **Types:** `src/lib/types.ts`
- **DB layer:** `src/lib/db.ts` — targets Supabase if configured, else `localStorage` (keys: `soul-*`)
- **Image storage:** `src/lib/storage.ts` — Supabase Storage with data URL fallback
- **DB schema:** `src/lib/schema.sql` — run manually in Supabase SQL Editor
- **Auth:** Supabase email/password OR hardcoded password `admin123` (configurable in admin settings)
- **Currency:** PHP (₱). Hours: 7:00 AM – 10:00 PM.
- **Room:** Only "The Haven Room" (3–12 pax, 1.5h/2h/3h durations, cake add-on)

## Quirks & Constraints

- **No tests, no linter, no formatter, no CI/CD, no `.gitignore`** — `.env` with live credentials is committed.
- **No README** — this file is the primary documentation.
- Room selection UI in booking page only shows when `rooms.length > 1`. Currently 1 room so it's hidden.
- Admin panel has 6 tabs: bookings, contacts, rooms, vouchers, analytics, settings.
- Pricing is per-person stored as JSONB (`Record<number, number>`).
- Default vouchers: `WELCOME10` (10%), `BIRTHDAY20` (20% off 8+), `SOUL500` (₱500 off).
- `booking.zip` at root (~1.8MB) — purpose unknown, possibly a data export.
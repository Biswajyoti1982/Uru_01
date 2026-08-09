# URU — Activities & Services Booking Marketplace

> Pivoted from "FitConnect" (fitness-only dark dashboard) to **URU**: a generic, mobile-first, Urban-Company-style booking app (salon, fitness, art, karate, skating, dance, music, yoga, swimming, tutoring). Light theme, purple (#6D28D9) accent.

## Iteration 2 (2026-08-09) — URU redesign
- Rebranded to URU; generic 10-category catalog.
- Customer app is mobile-first (max-w-md) with bottom tabs: Home (category grid + service cards), ServicePage (add-to-cart items with qty steppers), Cart, Checkout (Address → Date/Time slot → Summary → Confirm), My Bookings, Account.
- Data model change: service `classes/enrollments` → embedded `items` + `bookings`. Booking is FREE (INR prices shown; pay provider directly). Server computes booking total from item prices.
- Provider console & Admin console moved to `/manage/*` (light theme). Provider manages services + items; admin approves providers & moderates services.
- Verified: 20/20 backend tests pass; full customer booking flow passes with real UI taps (fixed cart Proceed z-index occlusion + confirm→bookings redirect).



## Original Problem Statement
Build an app where users subscribe to classes for different activities (gym training, sports coaching, wellness/other) offered by professionals. Service providers self-register and create schedules; an admin controls what's visible to customers; customers browse activities, view class schedules and enroll/subscribe (free). Basic structure to build upon.

## User Choices
- Deliverable: working full-stack app (also serves as the interactive wireframe)
- Roles: Customer + Service Provider + Admin
- Provider onboarding: self-register → admin approval
- Payments: none (free enroll/subscribe)
- Auth: Emergent-managed Google OAuth

## Architecture
- Frontend: React 19 (CRA/craco), react-router, Tailwind + shadcn/ui, framer-motion, sonner. Dark "Performance Pro" theme (Barlow Condensed + DM Sans, obsidian + neon #39FF14).
- Backend: FastAPI (async), all routes under /api.
- DB: MongoDB (motor). Collections: users, user_sessions, services, classes, enrollments. Custom UUID ids; `_id` excluded via projection.
- Auth: Emergent Google OAuth. httpOnly session_token cookie (7d) + Bearer fallback. Admin auto-assigned by email rrlfnlstrategy@gmail.com.

## User Personas
- Customer: browses activities, views schedules, enrolls, manages My Classes.
- Provider: applies to join, once approved publishes services + class schedules, sees attendees.
- Admin: approves providers, moderates services (approve/reject/visibility), views platform stats.

## Core Requirements (static)
- Role-based dashboard with contextual sidebar.
- Provider services require admin approval before customer visibility.
- Enrollment with capacity + duplicate guards.

## Implemented (2026-08-09)
- Google OAuth login, session mgmt, role gating (customer/provider/admin).
- Landing page (hero, categories, how-it-works).
- Customer: browse + category filter, activity detail w/ schedule, enroll/cancel, My Classes.
- Provider: application flow (pending/approved/rejected states), service CRUD, class schedule mgmt, attendees list.
- Admin: overview stats, provider approvals, service moderation (approve/reject/toggle-visibility).
- Seed data: demo provider + 3 approved services with class schedules.
- Verified: 15/15 backend tests pass, all critical frontend flows pass.

## Backlog / Remaining
- P1: Payments/paid subscriptions (Stripe) — deferred per user.
- P1: Notifications/reminders for upcoming classes (email via Resend).
- P2: Provider profiles/pages, reviews & ratings, recurring class scheduling.
- P2: Waitlists when class full; calendar month view.
- P2: Optional endpoint hardening (404 on missing ids, block re-apply while pending).

## Next Tasks
- Gather feedback on the initial structure, then prioritize scheduling depth vs. payments.

## Iteration 5 (2026-08-09) — Subscriptions (monthly/quarterly/yearly)
- Bookings are now subscriptions. Item prices are per-month; checkout has a Plan step: Monthly, Quarterly (save 10%), Yearly (save 20%).
- Backend computes per_month, months, discount, total, start_date and end_date (proper month math); stores plan on the booking with status "active".
- UI: plan selection + summary breakdown; customer "My subscriptions" (tab "Plans") shows plan, weekly slot, run dates and total; provider "Subscribers" list shows plan & slot. Prices show "/mo".
- Verified: quarterly 699/mo → ₹1,887 via curl; full UI flow (plan → address → weekly schedule → summary → confirm → My subscriptions).

## Iteration 4 (2026-08-09) — Per-provider availability
- Each service now stores `available_days` (0=Sun..6=Sat) and `slots` (HH:MM list); replaces the global fixed TIME_SLOTS for booking.
- Provider service editor has an Availability section (day toggles + time-slot grid). Checkout date row shows only available weekdays and only the provider's slots.
- Backend validates booking date/slot against the service's availability (400 otherwise). Verified via curl (bad slot→400, good→200) and UI (restricted service shows Mon/Wed/Fri + 3 slots).


## Iteration 7 (2026-06) — Provider-centric browsing + profiles
- **Browse flow changed**: tapping an activity on Home now shows a list of **providers** (coaches) offering it, not raw service cards. Provider cards show avatar, rating, experience, specialties, price-from.
- **Provider page** (`/app/provider/:id`): profile photo, rating, years of experience, languages, about/bio, certifications/qualifications, and all classes grouped by activity with items/prices and virtual/physical slot previews (physical shows society names). Add-to-cart → existing checkout.
- **Provider profile data**: users now store `experience_years, certifications[], specialties[], languages[], rating, avatar_url`. Editable via new **My Profile** tab in provider console (`PUT /api/provider/profile`) and captured in **Become-a-Provider** onboarding.
- **New endpoints**: `GET /api/providers[?category=]` (approved providers summary, sorted by rating), `GET /api/providers/{id}` (full profile + services with resolved `society_names`). Public detail excludes PII (phone) and only returns approved providers.
- Demo providers seeded with realistic experience/certifications/specialties/languages/ratings + avatars via `seed_providers()`.
- Verified: testing_agent iteration_5 — backend 37/37 (12 new + 25 regression), frontend 8/8 flows, no regressions.

## Iteration 6 (2026-06) — Virtual/Physical slots + Societies
- Classes can be **Virtual** or **Physical**. Service `slots` changed from `List[str]` to `List[{time, mode, societies}]` (`SlotConfig`, mode = Literal physical|virtual). Fixed a latent backend bug where slots were typed `List[str]` but code called `.model_dump()`.
- **Provider Dashboard**: new slot builder — pick time, toggle Physical/Virtual; physical slots require selecting one or more societies (multiselect from `GET /api/societies`). Edit dialog now correctly loads existing slots + available_days.
- **Customer Checkout**: dynamic step flow `plan → schedule → (address only if physical) → summary`. Physical slot reveals a society picker limited to that slot's societies (required); virtual slots skip address and show an online-joining note. Booking payload sends `mode` + `society_id`.
- **Admin**: new Societies page at `/manage/admin/societies` (+ sidebar nav) to manage the master society list via `POST /api/admin/societies`.
- Bookings store `mode`, `society_id`, `society_name`. Backend rejects physical booking without society (400) or a non-offered society (400).
- Legacy seeded services (string slots) cleared & re-seeded in object format.
- Verified: testing_agent iteration_3 — backend 11/11 new tests, frontend 6/6 flows, no regressions.

## Backlog (P1/P2)
- P1: Admin can pin/highlight activities/providers in a top strip on the Home feed.
- P2: Customer pause-subscription (holidays); real ratings from completed bookings (currently a seeded field); email renewal reminders (Resend).
- P2: Split monolithic server.py (~840 lines) into routers.
- P2: Cart UX — confirm toast when switching provider (single-service cart).

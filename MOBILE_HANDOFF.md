# URU — Mobile App Handoff (screens & flows for the Mobile Agent)

Paste this into the Mobile Agent prompt. It describes the app to rebuild in Expo/React Native.
Backend stays the same (see `/app/API_REFERENCE.md`) — the mobile app just calls those `/api` endpoints.

## App concept
URU is a **gym-only** marketplace: customers subscribe to certified gym trainers (personal / small-group / online). Trainers run a console; admins approve providers & services.

## Brand / design
- Dark, energetic aesthetic. Primary accent **orange `#F97316`**; near-black surfaces `#0B0F17` / `#111827` / `#151A24`; white cards on the customer side, dark cards in the console.
- Bold display headings, pill buttons, subtle motion. Mobile-first (single column).
- Use React Native equivalents of the current UI: `<View>/<Text>/<Pressable>/<Image>/<ScrollView>/<TextInput>`, a bottom tab bar, and a modal/sheet library for dialogs.

## Roles & entry
- On launch call `GET /api/auth/me`. If 401 → Login screen. Else route by role: `customer` → Customer tabs; `provider`/`admin` → Console.

## Auth screen (3 methods, in this order)
1. **Mobile + Password** (default) — sign in `{phone,password}` / sign up `{name,phone,password}` → `POST /api/auth/login` | `/register`.
2. **OTP** — enter mobile → `POST /api/auth/otp/request` → enter 6-digit code → `POST /api/auth/otp/verify` (code is **mocked = 123456** until an SMS provider is added).
3. **Continue with Google** — Emergent OAuth via Expo AuthSession/WebBrowser → `POST /api/auth/session` with `X-Session-ID`.
- Store the returned session token in Expo SecureStore; send as `Authorization: Bearer` on every request.

## CUSTOMER app (bottom tabs: Home · Plans/Browse · Account)

### Home — depends on subscription state (`GET /api/customer/home`)
- **No subscription** → a 4-step matching **Questionnaire** (goal, format, mode, experience+frequency), then a ranked trainer list (best match first) + all gym trainers. Trainer card → Provider page.
- **Subscribed** → dashboard:
  - **Subscription banner**: next session; if a session is **today**, show a **Start session** button → opens a "Session in progress" checklist of the trainer's planned exercises → Finish (calls `POST /api/customer/sessions/{id}/attend`).
  - **Summary tile**: Total / Done / Left + payment ("Paid on <date> · Next due <date>" or "Payment due").
  - **Session tracker**: last 3 sessions grouped by muscle-group chips (Chest/Back/Legs…).
  - **Progress**: weekly bar chart of sessions completed + muscle-group balance bars.
  - **Featured trainers** row + **Health tips**.

### Browse → Provider page → Checkout
- Provider page: profile (rating, experience, specialties, certifications, languages), services with focus-area/batch/level badges, slots (physical societies / virtual), plans.
- Checkout: pick plan item(s), plan (monthly/quarterly/yearly), mode (physical→pick society, or virtual), start date, address → `POST /api/bookings`.

### Account
- Profile, my subscriptions (`GET /api/bookings/me`, cancel), logout, "Become a provider" (`POST /api/provider/apply`).

## PROVIDER console (dark theme; sidebar/drawer: Home · My Services · My Profile · Bookings + Logout)
- **Home/Overview**: public profile preview, services, next-30-day session schedule.
- **My Services**: CRUD services with plan items, available days, and time slots (physical w/ societies + batch size, or virtual), plus focus areas / batch types / client levels.
- **My Profile**: editable public profile.
- **Bookings**: tabs **Clients / Calendar / Earnings**.
  - Clients: list subscribers with payment toggle (`PATCH .../payment`), **Log session** (`POST .../sessions`) and **Plan week** (`POST .../sessions/bulk`, a 7-day planner with an exercise library + custom entries).
  - Calendar: next 14 days session counts. Earnings: collected/due/potential.

## ADMIN console
- Overview stats; approve/reject **Providers** and **Services** (+ toggle visibility); manage **Activities** (categories) and **Societies**.
- Admins are Google accounts on an allowlist (`rrlfnlstrategy@gmail.com`, `connect@ubtan.in`, `biswajyoti.d01@gmail.com`). Mobile/OTP accounts are always `customer`.

## Exercise library (for session logging)
Categories: Chest, Back, Legs, Shoulders, Arms, Core, Cardio, Full Body, Mobility (+ custom). Each logged exercise = `{name, category}`; muscle-group colors drive the tracker/progress visuals.

## Notes / expectations
- OTP is mocked (123456) until Twilio (or similar) is wired.
- App-store submission, Apple ($99/yr) / Google Play ($25) developer accounts, signing, and EAS builds are handled outside Emergent.

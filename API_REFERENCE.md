# URU — Backend API Reference (for the Mobile Agent)

Reuse this exact FastAPI + MongoDB backend from the native (Expo/React Native) app.
Only the frontend is rebuilt; the backend stays as-is.

## Base URL & routing
- All endpoints are prefixed with `/api`.
- **Production base URL: `https://activity-connect-36.emergent.host`** → call `https://activity-connect-36.emergent.host/api/...`
- Do NOT hardcode in source; put the base URL in the mobile app's env/config (e.g. Expo `extra` / `EXPO_PUBLIC_API_URL`). In this web project the equivalent is `REACT_APP_BACKEND_URL`.
- Content-Type: `application/json`.

## Auth model (IMPORTANT for mobile)
- The web app uses an **httpOnly `session_token` cookie**. Mobile (React Native/Expo) cannot rely on browser cookies, so use the **`Authorization: Bearer <session_token>` header** instead — the backend already accepts either.
- Where do you get the token on mobile?
  - **Mobile + Password / OTP**: the login/register/verify responses set the cookie AND a session row is created. To get a usable Bearer token on mobile, the cleanest change is to have these endpoints ALSO return the raw `session_token` in the JSON body. (Currently they set it as a cookie only.) → **Ask the web agent (E1) to add `"session_token"` to the register/login/otp-verify JSON responses**, then store it in Expo SecureStore and send it as `Authorization: Bearer`.
  - **Google**: Emergent OAuth is browser-based; on mobile use Expo AuthSession/WebBrowser to complete the redirect, capture `session_id`, then call `POST /api/auth/session` with header `X-Session-ID` (returns the user; also sets cookie — again, expose the token in the body for mobile).
- `GET /api/auth/me` returns the current user (validate token on app launch). Returns 401 if not authed.
- Roles: `role` = `customer` | `provider` | `admin`; providers also have `provider_status` = `pending|approved|rejected`.

## Data models (key fields)
- **user**: `{ user_id, email, name, picture, role, provider_status, phone, login_phone, auth_method, business_name, bio, avatar_url, experience_years, age, gender, certifications[], specialties[], languages[], rating, society_id, society_name }`
- **service**: `{ id, provider_id, provider_name, title, description, category ("gym"), image_url, location, price/items[{id,name,price,duration_min}], available_days[0-6], slots[{time,mode:"physical"|"virtual",societies[],batch_size}], gender, age_group, experience_level, eligibility, focus_areas[], batch_types[], client_levels[], status, is_visible }`
- **booking**: `{ id, service_id, service_title, service_image, category, provider_id, provider_name, customer_id, items[{item_id,name,price,qty,duration_min}], per_month, plan, plan_label, months, total, date, time_slot, mode, society_id, society_name, start_date, end_date, address, notes, payment_status:"pending"|"paid", paid_at, status:"active"|"cancelled" }`
- **session_log**: `{ id, booking_id, customer_id, provider_id, service_id, service_title, date, title, exercises[{name,category}], status:"planned"|"completed", attended_at }`
- **category**: `{ id, label, icon, color }` ; **society**: `{ id, name, area }`
- Plans: `monthly` (1mo), `quarterly` (3mo, 10% off), `yearly` (12mo, 20% off).

---

## Endpoints

### Public / shared
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/categories | none | List activity categories |
| GET | /api/societies | none | List residential societies (physical slots) |
| GET | /api/timeslots | none | Preset time slots |
| GET | /api/plans | none | Subscription plans |
| GET | /api/services | none | Approved/visible gym services (sorted by booking count) |
| GET | /api/services/{service_id} | none | Single service |
| GET | /api/providers?category=gym | none | Approved gym trainers (summary cards) |
| GET | /api/providers/{provider_id} | none | Provider profile + their services |

### Auth
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /api/auth/register | none | `{name, phone, password}` → user (customer), sets session |
| POST | /api/auth/login | none | `{phone, password}` → user, sets session (429 after 5 fails) |
| POST | /api/auth/otp/request | none | `{phone}` → `{ok, dev_code:"123456"}` (OTP MOCKED) |
| POST | /api/auth/otp/verify | none | `{phone, code, name?}` → user (creates if new); code must be `123456` |
| POST | /api/auth/session | header `X-Session-ID` | Emergent Google exchange → user |
| GET | /api/auth/me | token | Current user (401 if none) |
| POST | /api/auth/logout | token | Clears session |

### Customer
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/customer/home?goal=<goal> | customer | Dashboard: `primary` subscription (next_session, today_session, summary), `tracker` (last 3 sessions), `category_summary`, `progress` {weekly[], muscle_balance[], total_completed}, `featured_trainers`, `tips` |
| POST | /api/bookings | customer | Create subscription. Body: `{service_id, items:[{item_id,qty}], date, time_slot, mode, society_id, address, plan, notes}` |
| GET | /api/bookings/me | customer | My subscriptions |
| DELETE | /api/bookings/{booking_id} | customer | Cancel a subscription |
| POST | /api/customer/sessions/{session_id}/attend | customer | Mark today's planned session attended (Start session) |

### Provider (console)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/provider/apply | user | Become a provider (pending) |
| PUT | /api/provider/profile | provider | Update public profile |
| GET | /api/provider/services | provider | My services |
| POST | /api/provider/services | provider | Create service (body = service model) |
| PUT | /api/provider/services/{id} | provider | Update service |
| DELETE | /api/provider/services/{id} | provider | Delete service |
| POST | /api/provider/services/{id}/items | provider | Add plan item |
| DELETE | /api/provider/services/{id}/items/{item_id} | provider | Remove item |
| GET | /api/provider/clients | provider | Subscribers (filters: service_id, plan, mode, payment_status) |
| PATCH | /api/provider/bookings/{booking_id}/payment | provider | `{status:"paid"|"pending"}` (sets paid_at) |
| GET | /api/provider/earnings | provider | Collected/due/potential + by service |
| GET | /api/provider/calendar?days=N | provider | Upcoming session counts per day |
| POST | /api/provider/bookings/{booking_id}/sessions | provider | Log one session `{date, title, exercises:[{name,category}]}` |
| POST | /api/provider/bookings/{booking_id}/sessions/bulk | provider | Plan a week: `{sessions:[{date,title,exercises[]}]}` (skips empty) |
| GET | /api/provider/bookings/{booking_id}/sessions | provider | List session logs |
| DELETE | /api/provider/sessions/{session_id} | provider | Delete a session log |

### Admin
| Method | Path | Auth |
|---|---|---|
| GET | /api/admin/stats | admin |
| GET | /api/admin/providers?status= | admin |
| POST | /api/admin/providers/{user_id}/approve · /reject | admin |
| GET | /api/admin/services?status= | admin |
| POST | /api/admin/services/{id}/approve · /reject · /toggle-visibility | admin |
| GET/POST/PUT/DELETE | /api/admin/categories[/{id}] | admin |
| POST | /api/admin/societies | admin |

## Backend is mobile-ready ✅
The auth responses now return the raw session token in JSON (in addition to the cookie), so the mobile app can store it in Expo SecureStore and send `Authorization: Bearer <session_token>`:
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/otp/verify`, and `POST /api/auth/session` (Google) all include `"session_token"` in the response body.
- Web app is unaffected (it keeps using the httpOnly cookie).

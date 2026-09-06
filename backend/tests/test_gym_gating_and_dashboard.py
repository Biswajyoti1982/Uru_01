"""Iteration 7 - Gym-only gating + provider dashboard/earnings/calendar/payment toggle."""
import os
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = "test_session_admin_001"
CUST = "test_session_cust_001"
PROV = "test_session_prov_001"  # user_demoprov_fit


def _h(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- Gym-only gating for customer-facing endpoints ----------
class TestGymGating:
    def test_services_only_gym(self):
        r = requests.get(f"{API}/services")
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        cats = {s["category"] for s in data}
        assert cats == {"gym"}, f"expected only gym, got {cats}"

    def test_providers_only_gym(self):
        r = requests.get(f"{API}/providers")
        assert r.status_code == 200
        data = r.json()
        all_cats = set()
        for p in data:
            for c in p.get("categories", []):
                all_cats.add(c)
        assert all_cats == {"gym"}, f"expected only gym, got {all_cats}"
        ids = {p["user_id"] for p in data}
        # seeded gym providers
        assert "user_demoprov_fit" in ids
        assert "user_demoprov_iron" in ids

    def test_providers_music_filter_empty(self):
        r = requests.get(f"{API}/providers", params={"category": "music"})
        assert r.status_code == 200
        assert r.json() == []

    def test_services_music_filter_empty(self):
        r = requests.get(f"{API}/services", params={"category": "music"})
        assert r.status_code == 200
        assert r.json() == []

    def test_non_gym_provider_404(self):
        # arts provider is seeded but not gym
        r = requests.get(f"{API}/providers/user_demoprov_arts")
        assert r.status_code == 404

    def test_gym_provider_ok_with_enrichment(self):
        r = requests.get(f"{API}/providers/user_demoprov_fit")
        assert r.status_code == 200
        p = r.json()
        # enrichment fields
        for k in ["age", "gender", "is_verified", "rating", "experience_years", "certifications", "languages", "services"]:
            assert k in p, f"missing {k}"
        # all services are gym
        assert all(s["category"] == "gym" for s in p["services"])


# ---------- Provider console: profile + service create with new fields ----------
class TestProviderProfileAndService:
    def test_get_and_update_profile(self):
        # There is no GET /provider/profile — use /auth/me for current values
        me = requests.get(f"{API}/auth/me", headers=_h(PROV)).json()
        prev = me

        body = {
            "business_name": prev.get("business_name") or "FitZone Academy",
            "bio": "Updated bio for iteration 7 test",
            "experience_years": 9,
            "age": 33,
            "gender": "male",
            "certifications": ["ACE", "NASM"],
            "specialties": ["Weight Loss", "Strength"],
            "languages": ["English", "Hindi"],
        }
        r = requests.put(f"{API}/provider/profile", json=body, headers=_h(PROV))
        assert r.status_code == 200, r.text
        # verify persistence via public endpoint
        pub = requests.get(f"{API}/providers/user_demoprov_fit").json()
        assert pub["age"] == 33
        assert pub["gender"] == "male"
        assert pub["experience_years"] == 9
        assert "ACE" in pub.get("certifications", [])
        assert "English" in pub.get("languages", [])

    def test_service_new_fields_persist(self):
        # list provider services and pick first
        r = requests.get(f"{API}/provider/services", headers=_h(PROV))
        assert r.status_code == 200
        svcs = r.json()
        assert len(svcs) > 0
        svc = svcs[0]
        sid = svc["id"]

        payload = {
            "title": svc["title"],
            "description": svc.get("description", ""),
            "category": svc["category"],
            "gender": "any",
            "age_group": "adults",
            "experience_level": "beginner",
            "eligibility": "18+ only; consult doctor if you have conditions",
            "items": svc.get("items", []),
            "slots": svc.get("slots", []),
            "available_days": svc.get("available_days", []),
        }
        # ensure slots have batch_size
        for s in payload["slots"]:
            s.setdefault("batch_size", 12)

        r = requests.put(f"{API}/provider/services/{sid}", json=payload, headers=_h(PROV))
        assert r.status_code == 200, r.text
        got = r.json()
        assert got.get("gender") == "any"
        assert got.get("age_group") == "adults"
        assert got.get("experience_level") == "beginner"
        assert "18+" in (got.get("eligibility") or "")
        if got.get("slots"):
            assert got["slots"][0].get("batch_size") == 12


# ---------- Booking creation -> dashboard aggregation ----------
class TestBookingAndDashboard:
    booking_id = None
    service_id = None

    def test_create_fresh_customer_booking(self):
        # fetch provider services for FitZone
        p = requests.get(f"{API}/providers/user_demoprov_fit").json()
        svc = p["services"][0]
        TestBookingAndDashboard.service_id = svc["id"]
        # find a virtual slot to skip society/address complexity
        virtual = next((s for s in svc.get("slots", []) if s.get("mode") == "virtual"), None)
        assert virtual, "no virtual slot found on seeded gym service"
        item = svc["items"][0]

        # pick a date matching available_days if configured
        from datetime import date, timedelta
        d = date.today() + timedelta(days=3)
        avail = svc.get("available_days") or []
        if avail:
            for i in range(1, 14):
                candidate = date.today() + timedelta(days=i)
                wd = (candidate.weekday() + 1) % 7
                if wd in avail:
                    d = candidate
                    break

        payload = {
            "service_id": svc["id"],
            "items": [{"item_id": item["id"], "qty": 1}],
            "date": d.isoformat(),
            "time_slot": virtual["time"],
            "mode": "virtual",
            "plan": "monthly",
            "address": "",
            "notes": "iter7 fresh booking",
        }
        r = requests.post(f"{API}/bookings", json=payload, headers=_h(CUST))
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["status"] == "active"
        assert b["payment_status"] == "pending"
        TestBookingAndDashboard.booking_id = b["id"]

    def test_provider_clients_lists_new_booking(self):
        r = requests.get(f"{API}/provider/clients", headers=_h(PROV))
        assert r.status_code == 200
        rows = r.json()
        assert any(row["id"] == TestBookingAndDashboard.booking_id for row in rows)
        row = next(row for row in rows if row["id"] == TestBookingAndDashboard.booking_id)
        for k in ["customer_name", "customer_email", "sessions_total",
                  "sessions_completed", "sessions_due", "fee_due", "payment_status"]:
            assert k in row

    def test_earnings_includes_potential(self):
        r = requests.get(f"{API}/provider/earnings", headers=_h(PROV))
        assert r.status_code == 200
        e = r.json()
        assert e["potential"] > 0
        assert "collected" in e and "due" in e and "by_service" in e
        assert e["due"] == e["potential"] - e["collected"]

    def test_mark_paid_updates_earnings(self):
        bid = TestBookingAndDashboard.booking_id
        before = requests.get(f"{API}/provider/earnings", headers=_h(PROV)).json()
        r = requests.patch(f"{API}/provider/bookings/{bid}/payment",
                           json={"status": "paid"}, headers=_h(PROV))
        assert r.status_code == 200, r.text
        assert r.json()["payment_status"] == "paid"
        after = requests.get(f"{API}/provider/earnings", headers=_h(PROV)).json()
        assert after["collected"] >= before["collected"], f"{before} -> {after}"
        # revert to pending
        r = requests.patch(f"{API}/provider/bookings/{bid}/payment",
                           json={"status": "pending"}, headers=_h(PROV))
        assert r.status_code == 200
        assert r.json()["payment_status"] == "pending"

    def test_calendar_returns_14_days(self):
        r = requests.get(f"{API}/provider/calendar", params={"days": 14}, headers=_h(PROV))
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 14
        for d in data:
            for k in ["date", "weekday", "day", "sessions", "clients", "by_service"]:
                assert k in d

    def test_cleanup_cancel_booking(self):
        # clean up our fresh booking so re-runs work
        bid = TestBookingAndDashboard.booking_id
        r = requests.delete(f"{API}/bookings/{bid}", headers=_h(CUST))
        assert r.status_code == 200


# ---------- Auth guards on new endpoints ----------
class TestNewEndpointsAuth:
    def test_clients_requires_provider(self):
        assert requests.get(f"{API}/provider/clients").status_code == 401
        assert requests.get(f"{API}/provider/clients", headers=_h(CUST)).status_code == 403

    def test_earnings_requires_provider(self):
        assert requests.get(f"{API}/provider/earnings").status_code == 401
        assert requests.get(f"{API}/provider/earnings", headers=_h(CUST)).status_code == 403

    def test_calendar_requires_provider(self):
        assert requests.get(f"{API}/provider/calendar").status_code == 401
        assert requests.get(f"{API}/provider/calendar", headers=_h(CUST)).status_code == 403

    def test_payment_toggle_forbidden_for_other(self):
        r = requests.patch(f"{API}/provider/bookings/does_not_exist/payment",
                           json={"status": "paid"}, headers=_h(PROV))
        assert r.status_code == 404

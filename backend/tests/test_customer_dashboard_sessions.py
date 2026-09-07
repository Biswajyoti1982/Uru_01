"""
Tests for Subscribed Customer Dashboard + Trainer Session Logging feature.
- Provider CRUD on session logs
- Customer dashboard aggregate (/customer/home)
- Attend flow
- Payment paid_at date on payment status update
"""
import os
import requests
import pytest
from datetime import datetime, timezone

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_backend_url()

PROVIDER_TOKEN = "test_session_biswa_001"
CUSTOMER_TOKEN = "test_session_cust_001"
BOOKING_ID = "bkg_da2f93ddae16"
OTHER_PROVIDER_TOKEN = "test_session_nosub_001"  # not the booking's provider


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_session_id():
    """Provider creates a session log for the tests that need one."""
    today = datetime.now(timezone.utc).date().isoformat()
    payload = {
        "date": today,
        "title": "TEST_ Automated session log",
        "exercises": [
            {"name": "TEST Bench Press", "category": "Chest"},
            {"name": "TEST Squat", "category": "Legs"},
        ],
    }
    r = requests.post(
        f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/sessions",
        json=payload,
        headers=_hdr(PROVIDER_TOKEN),
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["booking_id"] == BOOKING_ID
    assert data["title"] == payload["title"]
    assert len(data["exercises"]) == 2
    assert data["status"] == "planned"
    sid = data["id"]
    yield sid
    # cleanup
    requests.delete(f"{BASE_URL}/api/provider/sessions/{sid}", headers=_hdr(PROVIDER_TOKEN), timeout=15)


# ---------------- Provider session logging ----------------
class TestProviderSessionLogs:
    def test_list_session_logs_for_own_booking(self, created_session_id):
        r = requests.get(
            f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/sessions",
            headers=_hdr(PROVIDER_TOKEN), timeout=15,
        )
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert created_session_id in ids

    def test_provider_cannot_log_for_other_booking(self):
        payload = {"date": "2026-01-15", "title": "hack", "exercises": []}
        r = requests.post(
            f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/sessions",
            json=payload, headers=_hdr(OTHER_PROVIDER_TOKEN), timeout=15,
        )
        # OTHER_PROVIDER_TOKEN is a customer without provider role -> 403 or 404
        assert r.status_code in (403, 404)

    def test_provider_cannot_list_other_booking(self):
        r = requests.get(
            f"{BASE_URL}/api/provider/bookings/bkg_does_not_exist_xxx/sessions",
            headers=_hdr(PROVIDER_TOKEN), timeout=15,
        )
        assert r.status_code == 404

    def test_delete_session_log(self):
        # create then delete
        today = datetime.now(timezone.utc).date().isoformat()
        r = requests.post(
            f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/sessions",
            json={"date": today, "title": "TEST_delete", "exercises": []},
            headers=_hdr(PROVIDER_TOKEN), timeout=15,
        )
        sid = r.json()["id"]
        d = requests.delete(f"{BASE_URL}/api/provider/sessions/{sid}", headers=_hdr(PROVIDER_TOKEN), timeout=15)
        assert d.status_code == 200
        # confirm gone
        r2 = requests.get(f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/sessions", headers=_hdr(PROVIDER_TOKEN), timeout=15)
        assert sid not in [x["id"] for x in r2.json()]


# ---------------- Customer home aggregate ----------------
class TestCustomerHome:
    def test_home_has_expected_shape(self, created_session_id):
        r = requests.get(
            f"{BASE_URL}/api/customer/home?goal=build_muscle",
            headers=_hdr(CUSTOMER_TOKEN), timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["has_subscription"] is True
        assert data["primary"] is not None
        p = data["primary"]
        assert p["booking_id"] == BOOKING_ID
        # summary
        s = p["summary"]
        for k in ("total", "completed", "left", "payment_status", "next_due", "amount"):
            assert k in s
        assert s["payment_status"] == "paid"
        assert s["paid_at"]  # non-empty since paid
        # next_session (start_date == today per seed)
        assert p["next_session"] is not None
        assert p["next_session"]["is_today"] is True
        # today_session contains planned exercises
        assert p["today_session"] is not None
        # tracker + category_summary present
        assert isinstance(data["tracker"], list)
        assert isinstance(data["category_summary"], list)
        # featured trainers only gym
        assert isinstance(data["featured_trainers"], list)
        for t in data["featured_trainers"]:
            cats = t.get("categories") or []
            assert "gym" in cats or t.get("category") == "gym"
        # tips: build_muscle-first then general
        assert isinstance(data["tips"], list)
        assert len(data["tips"]) >= 1
        titles = [t["title"] for t in data["tips"]]
        # build_muscle title should appear before "Hydrate first"
        if "Progressive overload" in titles and "Hydrate first" in titles:
            assert titles.index("Progressive overload") < titles.index("Hydrate first")

    def test_tracker_contains_seeded_completed(self):
        r = requests.get(f"{BASE_URL}/api/customer/home", headers=_hdr(CUSTOMER_TOKEN), timeout=15)
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()["tracker"]]
        # Seed session ses_755e482249e2 already attended
        assert "ses_755e482249e2" in ids


# ---------------- Attend flow ----------------
class TestAttend:
    def test_attend_marks_completed_and_updates_home(self):
        today = datetime.now(timezone.utc).date().isoformat()
        # Create fresh session for this test
        cr = requests.post(
            f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/sessions",
            json={"date": today, "title": "TEST_attend", "exercises": [{"name": "TEST Row", "category": "Back"}]},
            headers=_hdr(PROVIDER_TOKEN), timeout=15,
        )
        sid = cr.json()["id"]
        try:
            a = requests.post(
                f"{BASE_URL}/api/customer/sessions/{sid}/attend",
                headers=_hdr(CUSTOMER_TOKEN), timeout=15,
            )
            assert a.status_code == 200, a.text
            body = a.json()
            assert body["status"] == "completed"
            assert body["attended_at"]

            # Home tracker includes it, category_summary has Back
            h = requests.get(f"{BASE_URL}/api/customer/home", headers=_hdr(CUSTOMER_TOKEN), timeout=15).json()
            assert sid in [t["id"] for t in h["tracker"]]
            cats = {c["category"] for c in h["category_summary"]}
            assert "Back" in cats
        finally:
            requests.delete(f"{BASE_URL}/api/provider/sessions/{sid}", headers=_hdr(PROVIDER_TOKEN), timeout=15)

    def test_attend_not_own_session_404(self):
        r = requests.post(
            f"{BASE_URL}/api/customer/sessions/ses_does_not_exist/attend",
            headers=_hdr(CUSTOMER_TOKEN), timeout=15,
        )
        assert r.status_code == 404


# ---------------- Payment paid_at ----------------
class TestPaymentPaidAt:
    def test_toggle_payment_status_toggles_paid_at(self):
        # get current state
        r0 = requests.get(f"{BASE_URL}/api/customer/home", headers=_hdr(CUSTOMER_TOKEN), timeout=15).json()
        original_status = r0["primary"]["summary"]["payment_status"]
        original_paid_at = r0["primary"]["summary"]["paid_at"]

        try:
            # set pending -> paid_at cleared
            p1 = requests.patch(
                f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/payment",
                json={"status": "pending"}, headers=_hdr(PROVIDER_TOKEN), timeout=15,
            )
            assert p1.status_code == 200, p1.text
            r1 = requests.get(f"{BASE_URL}/api/customer/home", headers=_hdr(CUSTOMER_TOKEN), timeout=15).json()
            assert r1["primary"]["summary"]["payment_status"] == "pending"
            assert not r1["primary"]["summary"]["paid_at"]

            # set paid -> paid_at set to today (date)
            p2 = requests.patch(
                f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/payment",
                json={"status": "paid"}, headers=_hdr(PROVIDER_TOKEN), timeout=15,
            )
            assert p2.status_code == 200, p2.text
            r2 = requests.get(f"{BASE_URL}/api/customer/home", headers=_hdr(CUSTOMER_TOKEN), timeout=15).json()
            assert r2["primary"]["summary"]["payment_status"] == "paid"
            paid_at = r2["primary"]["summary"]["paid_at"]
            assert paid_at
            # Should be a date string (YYYY-MM-DD) or ISO datetime
            assert len(paid_at) >= 10
        finally:
            # restore
            requests.patch(
                f"{BASE_URL}/api/provider/bookings/{BOOKING_ID}/payment",
                json={"status": original_status}, headers=_hdr(PROVIDER_TOKEN), timeout=15,
            )

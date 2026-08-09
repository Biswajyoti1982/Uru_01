"""URU backend API tests - auth, services (items), bookings, provider mgmt, admin, RBAC."""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

ADMIN_TOKEN = "test_session_admin_001"
CUST_TOKEN = "test_session_cust_001"

_mongo = MongoClient(MONGO_URL)
_db = _mongo[DB_NAME]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _create_user_session(role="customer", provider_status=None, email=None):
    uid = f"user_test_{uuid.uuid4().hex[:8]}"
    tok = f"test_session_{uuid.uuid4().hex[:10]}"
    _db.users.insert_one({
        "user_id": uid,
        "email": email or f"{uid}@example.com",
        "name": f"Test {uid}",
        "picture": "",
        "role": role,
        "provider_status": provider_status,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    _db.user_sessions.insert_one({
        "user_id": uid,
        "session_token": tok,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return uid, tok


def _cleanup_user(uid):
    _db.bookings.delete_many({"customer_id": uid})
    _db.bookings.delete_many({"provider_id": uid})
    _db.services.delete_many({"provider_id": uid})
    _db.users.delete_one({"user_id": uid})
    _db.user_sessions.delete_many({"user_id": uid})


# -------------------- Auth guard --------------------
class TestAuthGuard:
    def test_me_unauth(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_admin_stats_unauth(self):
        assert requests.get(f"{API}/admin/stats").status_code == 401

    def test_provider_services_unauth(self):
        assert requests.get(f"{API}/provider/services").status_code == 401

    def test_my_bookings_unauth(self):
        assert requests.get(f"{API}/bookings/me").status_code == 401

    def test_me_admin(self):
        r = requests.get(f"{API}/auth/me", headers=_hdr(ADMIN_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_customer(self):
        r = requests.get(f"{API}/auth/me", headers=_hdr(CUST_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "customer"


# -------------------- Public --------------------
class TestPublic:
    def test_categories(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        assert len(r.json()) == 10

    def test_timeslots(self):
        r = requests.get(f"{API}/timeslots")
        assert r.status_code == 200
        assert len(r.json()) == 10

    def test_list_services_seeded(self):
        r = requests.get(f"{API}/services")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 5
        for s in data:
            assert s["status"] == "approved"
            assert s["is_visible"] is True
            assert isinstance(s.get("items"), list)

    def test_service_detail_items(self):
        services = requests.get(f"{API}/services").json()
        svc_id = services[0]["id"]
        r = requests.get(f"{API}/services/{svc_id}")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and len(data["items"]) > 0
        assert "id" in data["items"][0]
        assert "price" in data["items"][0]

    def test_service_detail_404(self):
        assert requests.get(f"{API}/services/nonexistent").status_code == 404


# -------------------- Booking flow --------------------
class TestBookingFlow:
    def test_full_booking_flow(self):
        uid, tok = _create_user_session(role="customer")
        try:
            services = requests.get(f"{API}/services").json()
            svc = services[0]
            svc_full = requests.get(f"{API}/services/{svc['id']}").json()
            items = svc_full["items"]
            i1, i2 = items[0], items[1] if len(items) > 1 else items[0]
            expected_total = i1["price"] * 2 + (i2["price"] if i2 is not i1 else 0)

            payload = {
                "service_id": svc["id"],
                "items": [{"item_id": i1["id"], "qty": 2}] + (
                    [{"item_id": i2["id"], "qty": 1}] if i2 is not i1 else []
                ),
                "date": "2030-05-05",
                "time_slot": "10:00",
                "address": "TEST_Addr, Mumbai",
                "notes": "gate 5",
            }
            r = requests.post(f"{API}/bookings", json=payload, headers=_hdr(tok))
            assert r.status_code == 200, r.text
            bkg = r.json()
            assert bkg["status"] == "confirmed"
            assert bkg["total"] == round(expected_total, 2)
            assert bkg["customer_id"] == uid
            assert len(bkg["items"]) == len(payload["items"])
            bkg_id = bkg["id"]

            # my bookings
            mine = requests.get(f"{API}/bookings/me", headers=_hdr(tok)).json()
            assert any(b["id"] == bkg_id for b in mine)

            # cancel
            r = requests.delete(f"{API}/bookings/{bkg_id}", headers=_hdr(tok))
            assert r.status_code == 200
            mine = requests.get(f"{API}/bookings/me", headers=_hdr(tok)).json()
            found = [b for b in mine if b["id"] == bkg_id][0]
            assert found["status"] == "cancelled"
        finally:
            _cleanup_user(uid)

    def test_booking_invalid_item(self):
        uid, tok = _create_user_session(role="customer")
        try:
            svc = requests.get(f"{API}/services").json()[0]
            r = requests.post(f"{API}/bookings", json={
                "service_id": svc["id"],
                "items": [{"item_id": "bogus_id", "qty": 1}],
                "date": "2030-01-01", "time_slot": "10:00", "address": "x"
            }, headers=_hdr(tok))
            assert r.status_code == 400
        finally:
            _cleanup_user(uid)

    def test_booking_empty_items(self):
        uid, tok = _create_user_session(role="customer")
        try:
            svc = requests.get(f"{API}/services").json()[0]
            r = requests.post(f"{API}/bookings", json={
                "service_id": svc["id"], "items": [],
                "date": "2030-01-01", "time_slot": "10:00", "address": "x"
            }, headers=_hdr(tok))
            assert r.status_code == 400
        finally:
            _cleanup_user(uid)

    def test_booking_invalid_service(self):
        uid, tok = _create_user_session(role="customer")
        try:
            r = requests.post(f"{API}/bookings", json={
                "service_id": "nope", "items": [{"item_id": "x", "qty": 1}],
                "date": "2030-01-01", "time_slot": "10:00", "address": "x"
            }, headers=_hdr(tok))
            assert r.status_code == 404
        finally:
            _cleanup_user(uid)


# -------------------- Provider onboarding & mgmt --------------------
class TestProviderFlow:
    def test_apply_approve_create_service(self):
        uid, tok = _create_user_session(role="customer")
        try:
            # blocked before approval
            assert requests.get(f"{API}/provider/services", headers=_hdr(tok)).status_code == 403

            r = requests.post(f"{API}/provider/apply", json={
                "business_name": "TEST_Biz", "bio": "b", "phone": "1"
            }, headers=_hdr(tok))
            assert r.status_code == 200
            assert r.json()["provider_status"] == "pending"

            # still blocked (pending)
            assert requests.post(f"{API}/provider/services", json={
                "title": "x", "category": "salon", "items": []
            }, headers=_hdr(tok)).status_code == 403

            # admin approve
            r = requests.post(f"{API}/admin/providers/{uid}/approve", headers=_hdr(ADMIN_TOKEN))
            assert r.status_code == 200

            me = requests.get(f"{API}/auth/me", headers=_hdr(tok)).json()
            assert me["role"] == "provider" and me["provider_status"] == "approved"

            # create service with items
            r = requests.post(f"{API}/provider/services", json={
                "title": "TEST_Svc", "description": "d", "category": "yoga",
                "items": [{"name": "Beginner", "price": 299, "duration_min": 60}]
            }, headers=_hdr(tok))
            assert r.status_code == 200, r.text
            svc = r.json()
            assert svc["status"] == "pending"
            assert len(svc["items"]) == 1
            assert svc["items"][0]["id"].startswith("item_")

            # not in public list
            pub = requests.get(f"{API}/services").json()
            assert all(s["id"] != svc["id"] for s in pub)

            # admin approve service
            requests.post(f"{API}/admin/services/{svc['id']}/approve", headers=_hdr(ADMIN_TOKEN))
            pub = requests.get(f"{API}/services").json()
            assert any(s["id"] == svc["id"] for s in pub)

            # toggle visibility -> hidden
            requests.post(f"{API}/admin/services/{svc['id']}/toggle-visibility", headers=_hdr(ADMIN_TOKEN))
            pub = requests.get(f"{API}/services").json()
            assert all(s["id"] != svc["id"] for s in pub)

            # add item
            r = requests.post(f"{API}/provider/services/{svc['id']}/items", json={
                "name": "Advanced", "price": 599, "duration_min": 90
            }, headers=_hdr(tok))
            assert r.status_code == 200
            new_item_id = r.json()["id"]

            # delete item
            r = requests.delete(f"{API}/provider/services/{svc['id']}/items/{new_item_id}", headers=_hdr(tok))
            assert r.status_code == 200

            # provider bookings
            r = requests.get(f"{API}/provider/bookings", headers=_hdr(tok))
            assert r.status_code == 200

            # invalid category
            r = requests.post(f"{API}/provider/services", json={
                "title": "bad", "category": "not_real", "items": []
            }, headers=_hdr(tok))
            assert r.status_code == 400

            # delete service
            r = requests.delete(f"{API}/provider/services/{svc['id']}", headers=_hdr(tok))
            assert r.status_code == 200
        finally:
            _cleanup_user(uid)


# -------------------- RBAC --------------------
class TestRBAC:
    def test_customer_cannot_hit_admin(self):
        assert requests.get(f"{API}/admin/stats", headers=_hdr(CUST_TOKEN)).status_code == 403

    def test_customer_cannot_hit_provider(self):
        assert requests.get(f"{API}/provider/services", headers=_hdr(CUST_TOKEN)).status_code == 403

    def test_admin_stats_ok(self):
        r = requests.get(f"{API}/admin/stats", headers=_hdr(ADMIN_TOKEN))
        assert r.status_code == 200
        data = r.json()
        for k in ["customers", "providers", "pending_providers", "services", "pending_services", "bookings"]:
            assert k in data and isinstance(data[k], int)

    def test_admin_can_list_providers_and_services(self):
        assert requests.get(f"{API}/admin/providers", headers=_hdr(ADMIN_TOKEN)).status_code == 200
        assert requests.get(f"{API}/admin/services", headers=_hdr(ADMIN_TOKEN)).status_code == 200

"""FitConnect backend API tests - auth, provider onboarding, services, enrollments, admin."""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://activity-connect-36.preview.emergentagent.com").rstrip("/")
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


# -------------------- Auth guard --------------------
class TestAuthGuard:
    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_admin_stats_unauth(self):
        r = requests.get(f"{API}/admin/stats")
        assert r.status_code == 401

    def test_provider_services_unauth(self):
        r = requests.get(f"{API}/provider/services")
        assert r.status_code == 401

    def test_me_admin(self):
        r = requests.get(f"{API}/auth/me", headers=_hdr(ADMIN_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_customer(self):
        r = requests.get(f"{API}/auth/me", headers=_hdr(CUST_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "customer"


# -------------------- Public services & categories --------------------
class TestPublicServices:
    def test_categories(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_list_services_seeded(self):
        r = requests.get(f"{API}/services")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 3
        for s in data:
            assert s["status"] == "approved"
            assert s["is_visible"] is True

    def test_service_detail_with_classes(self):
        services = requests.get(f"{API}/services").json()
        svc_id = services[0]["id"]
        r = requests.get(f"{API}/services/{svc_id}")
        assert r.status_code == 200
        data = r.json()
        assert "classes" in data
        assert isinstance(data["classes"], list)


# -------------------- Customer enrollment flow --------------------
class TestEnrollmentFlow:
    def test_full_enroll_flow(self):
        # Fresh customer
        uid, tok = _create_user_session(role="customer")
        try:
            services = requests.get(f"{API}/services").json()
            svc = requests.get(f"{API}/services/{services[0]['id']}").json()
            class_id = svc["classes"][0]["id"]

            # enroll
            r = requests.post(f"{API}/enrollments", json={"class_id": class_id}, headers=_hdr(tok))
            assert r.status_code == 200, r.text
            enr = r.json()
            assert enr["class_id"] == class_id
            enr_id = enr["id"]

            # duplicate blocked
            r2 = requests.post(f"{API}/enrollments", json={"class_id": class_id}, headers=_hdr(tok))
            assert r2.status_code == 400

            # my enrollments
            r3 = requests.get(f"{API}/enrollments/me", headers=_hdr(tok))
            assert r3.status_code == 200
            assert any(e["id"] == enr_id for e in r3.json())

            # unenroll
            r4 = requests.delete(f"{API}/enrollments/{enr_id}", headers=_hdr(tok))
            assert r4.status_code == 200
            assert all(e["id"] != enr_id for e in requests.get(f"{API}/enrollments/me", headers=_hdr(tok)).json())
        finally:
            _db.enrollments.delete_many({"customer_id": uid})
            _db.users.delete_one({"user_id": uid})
            _db.user_sessions.delete_many({"user_id": uid})

    def test_enroll_capacity_full(self):
        # Create a provider + service + class with capacity 1
        pid, ptok = _create_user_session(role="provider", provider_status="approved")
        c1uid, c1tok = _create_user_session(role="customer")
        c2uid, c2tok = _create_user_session(role="customer")
        try:
            # Create service via provider
            sr = requests.post(f"{API}/provider/services", json={
                "title": "TEST_CapService", "description": "d", "category": "gym"
            }, headers=_hdr(ptok))
            assert sr.status_code == 200, sr.text
            svc_id = sr.json()["id"]
            # approve
            requests.post(f"{API}/admin/services/{svc_id}/approve", headers=_hdr(ADMIN_TOKEN))
            # create class capacity=1
            cr = requests.post(f"{API}/provider/services/{svc_id}/classes", json={
                "title": "T", "date": "2030-01-01", "start_time": "10:00", "end_time": "11:00", "capacity": 1
            }, headers=_hdr(ptok))
            assert cr.status_code == 200, cr.text
            class_id = cr.json()["id"]

            r1 = requests.post(f"{API}/enrollments", json={"class_id": class_id}, headers=_hdr(c1tok))
            assert r1.status_code == 200
            r2 = requests.post(f"{API}/enrollments", json={"class_id": class_id}, headers=_hdr(c2tok))
            assert r2.status_code == 400
            assert "full" in r2.json().get("detail", "").lower()
        finally:
            _db.enrollments.delete_many({"provider_id": pid})
            _db.classes.delete_many({"provider_id": pid})
            _db.services.delete_many({"provider_id": pid})
            for u in (pid, c1uid, c2uid):
                _db.users.delete_one({"user_id": u})
                _db.user_sessions.delete_many({"user_id": u})


# -------------------- Provider onboarding & RBAC --------------------
class TestProviderOnboarding:
    def test_apply_then_approve_flow(self):
        uid, tok = _create_user_session(role="customer")
        try:
            # non-approved blocked from provider/services
            r = requests.get(f"{API}/provider/services", headers=_hdr(tok))
            assert r.status_code == 403

            # apply
            r = requests.post(f"{API}/provider/apply", json={
                "business_name": "TEST_Biz", "bio": "b", "phone": "1"
            }, headers=_hdr(tok))
            assert r.status_code == 200
            assert r.json()["provider_status"] == "pending"

            # still blocked (pending)
            r = requests.get(f"{API}/provider/services", headers=_hdr(tok))
            assert r.status_code == 403

            # admin approve
            r = requests.post(f"{API}/admin/providers/{uid}/approve", headers=_hdr(ADMIN_TOKEN))
            assert r.status_code == 200

            # verify role updated
            me = requests.get(f"{API}/auth/me", headers=_hdr(tok)).json()
            assert me["role"] == "provider"
            assert me["provider_status"] == "approved"

            # now can list provider services
            r = requests.get(f"{API}/provider/services", headers=_hdr(tok))
            assert r.status_code == 200

            # create service -> pending
            r = requests.post(f"{API}/provider/services", json={
                "title": "TEST_NewSvc", "description": "d", "category": "wellness"
            }, headers=_hdr(tok))
            assert r.status_code == 200
            svc = r.json()
            assert svc["status"] == "pending"
            assert svc["provider_id"] == uid

            # not visible publicly
            pub = requests.get(f"{API}/services").json()
            assert all(s["id"] != svc["id"] for s in pub)

            # admin approve service -> visible
            requests.post(f"{API}/admin/services/{svc['id']}/approve", headers=_hdr(ADMIN_TOKEN))
            pub = requests.get(f"{API}/services").json()
            assert any(s["id"] == svc["id"] for s in pub)

            # toggle visibility -> hidden
            requests.post(f"{API}/admin/services/{svc['id']}/toggle-visibility", headers=_hdr(ADMIN_TOKEN))
            pub = requests.get(f"{API}/services").json()
            assert all(s["id"] != svc["id"] for s in pub)

            # add class
            r = requests.post(f"{API}/provider/services/{svc['id']}/classes", json={
                "title": "TEST_Cls", "date": "2030-02-02", "start_time": "10:00", "end_time": "11:00", "capacity": 5
            }, headers=_hdr(tok))
            assert r.status_code == 200

            # provider enrollments endpoint reachable
            r = requests.get(f"{API}/provider/enrollments", headers=_hdr(tok))
            assert r.status_code == 200
        finally:
            _db.classes.delete_many({"provider_id": uid})
            _db.services.delete_many({"provider_id": uid})
            _db.enrollments.delete_many({"provider_id": uid})
            _db.users.delete_one({"user_id": uid})
            _db.user_sessions.delete_many({"user_id": uid})

    def test_admin_reject_service(self):
        # use demo seeded provider - create a temp service via direct insert not possible via API without provider token, so use flow
        uid, tok = _create_user_session(role="provider", provider_status="approved")
        try:
            sr = requests.post(f"{API}/provider/services", json={
                "title": "TEST_Reject", "description": "d", "category": "sports"
            }, headers=_hdr(tok))
            svc_id = sr.json()["id"]
            r = requests.post(f"{API}/admin/services/{svc_id}/reject", headers=_hdr(ADMIN_TOKEN))
            assert r.status_code == 200
            svc = _db.services.find_one({"id": svc_id}, {"_id": 0})
            assert svc["status"] == "rejected"
        finally:
            _db.services.delete_many({"provider_id": uid})
            _db.users.delete_one({"user_id": uid})
            _db.user_sessions.delete_many({"user_id": uid})


# -------------------- RBAC --------------------
class TestRBAC:
    def test_customer_cannot_hit_admin(self):
        r = requests.get(f"{API}/admin/stats", headers=_hdr(CUST_TOKEN))
        assert r.status_code == 403

    def test_customer_cannot_hit_provider(self):
        r = requests.get(f"{API}/provider/services", headers=_hdr(CUST_TOKEN))
        assert r.status_code == 403

    def test_admin_stats_ok(self):
        r = requests.get(f"{API}/admin/stats", headers=_hdr(ADMIN_TOKEN))
        assert r.status_code == 200
        data = r.json()
        for k in ["customers", "providers", "pending_providers", "services", "pending_services", "classes", "enrollments"]:
            assert k in data
            assert isinstance(data[k], int)

"""Regression tests after context providers refactor (iteration 4):
- Auth: /auth/me works for all roles (session cookie/Bearer), logout.
- Categories: public GET + admin CRUD (create, edit, delete with in-use guard).
"""
import os
import time
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_TOKEN = "test_session_admin_001"
CUST_TOKEN = "test_session_cust_001"
PROV_TOKEN = "test_session_prov_001"


def hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- auth ----------
class TestAuth:
    def test_auth_me_admin_bearer(self):
        r = requests.get(f"{API}/auth/me", headers=hdr(ADMIN_TOKEN))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "admin"

    def test_auth_me_customer(self):
        r = requests.get(f"{API}/auth/me", headers=hdr(CUST_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "customer"

    def test_auth_me_provider(self):
        r = requests.get(f"{API}/auth/me", headers=hdr(PROV_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "provider"

    def test_auth_me_cookie(self):
        r = requests.get(f"{API}/auth/me", cookies={"session_token": ADMIN_TOKEN})
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_auth_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_rbac_admin_only(self):
        # customer can't list admin providers
        r = requests.get(f"{API}/admin/providers", headers=hdr(CUST_TOKEN))
        assert r.status_code == 403
        r2 = requests.get(f"{API}/admin/providers", headers=hdr(ADMIN_TOKEN))
        assert r2.status_code == 200

    def test_logout_does_not_error(self):
        # Do not actually logout the shared seeded session - just ensure endpoint works with a fresh no-op
        # Send with no session -> should still 200 (idempotent)
        r = requests.post(f"{API}/auth/logout")
        assert r.status_code in (200, 204)


# ---------- categories ----------
class TestCategories:
    def test_public_categories_load(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for c in data:
            assert "id" in c and "label" in c

    def test_admin_categories_list_requires_admin(self):
        r = requests.get(f"{API}/admin/categories", headers=hdr(CUST_TOKEN))
        assert r.status_code == 403
        r2 = requests.get(f"{API}/admin/categories", headers=hdr(ADMIN_TOKEN))
        assert r2.status_code == 200

    def test_create_edit_delete_category_flow(self):
        label = f"TEST_Cat_{int(time.time())}"
        # create
        r = requests.post(f"{API}/admin/categories",
                          json={"label": label, "icon": "Sparkles", "color": "#6D28D9"},
                          headers=hdr(ADMIN_TOKEN))
        assert r.status_code == 200, r.text
        created = r.json()
        cid = created["id"]
        assert created["label"] == label
        assert created["icon"] == "Sparkles"

        # verify in public list
        pub = requests.get(f"{API}/categories").json()
        assert any(c["id"] == cid for c in pub)

        # edit
        new_label = label + "_edited"
        u = requests.put(f"{API}/admin/categories/{cid}",
                         json={"label": new_label, "icon": "Star", "color": "#FF0000"},
                         headers=hdr(ADMIN_TOKEN))
        assert u.status_code == 200, u.text
        assert u.json()["label"] == new_label
        assert u.json()["icon"] == "Star"
        assert u.json()["color"] == "#FF0000"

        # verify persisted via GET
        pub2 = requests.get(f"{API}/categories").json()
        edited = next(c for c in pub2 if c["id"] == cid)
        assert edited["label"] == new_label

        # delete
        d = requests.delete(f"{API}/admin/categories/{cid}", headers=hdr(ADMIN_TOKEN))
        assert d.status_code == 200, d.text
        # verify gone
        pub3 = requests.get(f"{API}/categories").json()
        assert not any(c["id"] == cid for c in pub3)

    def test_delete_in_use_category_returns_400(self):
        # find a category actually referenced by a service
        services = requests.get(f"{API}/services").json()
        used = {s["category"] for s in services if s.get("category")}
        assert used, "No services with categories in seed"
        target = next(iter(used))
        r = requests.delete(f"{API}/admin/categories/{target}", headers=hdr(ADMIN_TOKEN))
        assert r.status_code == 400
        assert "service" in r.json()["detail"].lower() or "use" in r.json()["detail"].lower()

    def test_edit_nonexistent_category_404(self):
        r = requests.put(f"{API}/admin/categories/does_not_exist_xyz",
                         json={"label": "x", "icon": "Star", "color": "#000"},
                         headers=hdr(ADMIN_TOKEN))
        assert r.status_code == 404

    def test_non_admin_cannot_create_category(self):
        r = requests.post(f"{API}/admin/categories",
                          json={"label": "TEST_no", "icon": "Star", "color": "#000"},
                          headers=hdr(CUST_TOKEN))
        assert r.status_code == 403


# ---------- bookings persistence (cart-equivalent smoke) ----------
class TestBookingSmoke:
    def test_customer_can_list_bookings(self):
        r = requests.get(f"{API}/bookings/me", headers=hdr(CUST_TOKEN))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

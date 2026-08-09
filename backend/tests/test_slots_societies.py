"""Backend tests for physical/virtual slots and societies (iteration 3)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_TOKEN = "test_session_admin_001"
CUST_TOKEN = "test_session_cust_001"
PROV_TOKEN = "test_session_prov_001"


def hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- societies (admin) ----------
class TestSocieties:
    def test_public_get_societies(self):
        r = requests.get(f"{API}/societies")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 4
        assert all("id" in s and "name" in s for s in data)

    def test_admin_create_society_persists(self):
        name = f"TEST_Society_{int(time.time())}"
        r = requests.post(f"{API}/admin/societies", json={"name": name, "area": "TEST_Area"}, headers=hdr(ADMIN_TOKEN))
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["name"] == name
        assert created["area"] == "TEST_Area"
        assert created["id"].startswith("soc_")
        # appears in public list
        r2 = requests.get(f"{API}/societies")
        ids = [s["id"] for s in r2.json()]
        assert created["id"] in ids

    def test_admin_create_society_duplicate_400(self):
        name = f"TEST_Dup_{int(time.time())}"
        r1 = requests.post(f"{API}/admin/societies", json={"name": name, "area": ""}, headers=hdr(ADMIN_TOKEN))
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/admin/societies", json={"name": name, "area": ""}, headers=hdr(ADMIN_TOKEN))
        assert r2.status_code == 400

    def test_non_admin_cannot_create_society(self):
        r = requests.post(f"{API}/admin/societies", json={"name": "TEST_x", "area": ""}, headers=hdr(CUST_TOKEN))
        assert r.status_code == 403


# ---------- provider services with mixed slots ----------
class TestProviderServicesSlots:
    def _societies(self):
        return [s["id"] for s in requests.get(f"{API}/societies").json()][:2]

    def test_create_service_with_mixed_slots(self):
        socs = self._societies()
        payload = {
            "title": "TEST_MixedSlots",
            "description": "d",
            "category": "gym",
            "image_url": "",
            "location": "",
            "items": [{"name": "TEST_Item", "price": 100, "duration_min": 60}],
            "available_days": [0, 1, 2, 3, 4, 5, 6],
            "slots": [
                {"time": "09:00", "mode": "physical", "societies": socs},
                {"time": "17:00", "mode": "virtual", "societies": []},
            ],
        }
        r = requests.post(f"{API}/provider/services", json=payload, headers=hdr(PROV_TOKEN))
        assert r.status_code == 200, r.text
        svc = r.json()
        assert len(svc["slots"]) == 2
        modes = {s["mode"] for s in svc["slots"]}
        assert modes == {"physical", "virtual"}
        # persisted as objects
        phys = next(s for s in svc["slots"] if s["mode"] == "physical")
        assert phys["societies"] == socs
        virt = next(s for s in svc["slots"] if s["mode"] == "virtual")
        assert virt["societies"] == []
        # get again to verify persistence
        r2 = requests.get(f"{API}/services/{svc['id']}")
        assert r2.status_code == 200
        assert r2.json()["slots"] == svc["slots"]
        # cleanup
        requests.delete(f"{API}/provider/services/{svc['id']}", headers=hdr(PROV_TOKEN))

    def test_edit_service_preserves_slots_reload(self):
        socs = self._societies()
        create = requests.post(f"{API}/provider/services", json={
            "title": "TEST_Edit", "category": "gym",
            "items": [{"name": "i", "price": 50, "duration_min": 30}],
            "available_days": [1, 3, 5],
            "slots": [{"time": "10:00", "mode": "physical", "societies": socs}],
        }, headers=hdr(PROV_TOKEN))
        assert create.status_code == 200, create.text
        sid = create.json()["id"]
        # update - add a virtual slot
        upd = requests.put(f"{API}/provider/services/{sid}", json={
            "title": "TEST_Edit2", "category": "gym",
            "items": [{"name": "i", "price": 50, "duration_min": 30}],
            "available_days": [1, 3, 5],
            "slots": [
                {"time": "10:00", "mode": "physical", "societies": socs},
                {"time": "18:00", "mode": "virtual", "societies": []},
            ],
        }, headers=hdr(PROV_TOKEN))
        assert upd.status_code == 200, upd.text
        data = upd.json()
        assert data["title"] == "TEST_Edit2"
        assert len(data["slots"]) == 2
        assert data["available_days"] == [1, 3, 5]
        requests.delete(f"{API}/provider/services/{sid}", headers=hdr(PROV_TOKEN))


# ---------- booking validation ----------
class TestBookingValidation:
    @pytest.fixture(scope="class")
    def svc(self):
        # seeded provider service
        services = requests.get(f"{API}/services").json()
        s = next(x for x in services if x["provider_id"] == "user_demoprov_fit" and x.get("slots"))
        return s

    def _base_payload(self, svc, mode, time_slot, society_id=""):
        return {
            "service_id": svc["id"],
            "items": [{"item_id": svc["items"][0]["id"], "qty": 1}],
            "date": "2026-02-02",  # monday
            "time_slot": time_slot,
            "mode": mode,
            "society_id": society_id,
            "address": "TEST_addr",
            "plan": "monthly",
        }

    def test_physical_without_society_400(self, svc):
        p = self._base_payload(svc, "physical", "09:00", "")
        r = requests.post(f"{API}/bookings", json=p, headers=hdr(CUST_TOKEN))
        assert r.status_code == 400
        assert "society" in r.json()["detail"].lower()

    def test_physical_with_society_not_offered_400(self, svc):
        # create fresh society not in slot
        name = f"TEST_NotOffered_{int(time.time())}"
        r = requests.post(f"{API}/admin/societies", json={"name": name, "area": ""}, headers=hdr(ADMIN_TOKEN))
        assert r.status_code == 200
        bad_soc = r.json()["id"]
        p = self._base_payload(svc, "physical", "09:00", bad_soc)
        rb = requests.post(f"{API}/bookings", json=p, headers=hdr(CUST_TOKEN))
        assert rb.status_code == 400
        assert "society" in rb.json()["detail"].lower()

    def test_physical_valid_booking(self, svc):
        soc = svc["slots"][0]["societies"][0]
        p = self._base_payload(svc, "physical", "09:00", soc)
        r = requests.post(f"{API}/bookings", json=p, headers=hdr(CUST_TOKEN))
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["mode"] == "physical"
        assert b["society_id"] == soc
        assert b["society_name"]
        # verify persisted
        me = requests.get(f"{API}/bookings/me", headers=hdr(CUST_TOKEN)).json()
        assert any(x["id"] == b["id"] and x["society_id"] == soc for x in me)
        requests.delete(f"{API}/bookings/{b['id']}", headers=hdr(CUST_TOKEN))

    def test_virtual_booking_no_society(self, svc):
        p = self._base_payload(svc, "virtual", "17:00", "")
        p["address"] = "Online class"
        r = requests.post(f"{API}/bookings", json=p, headers=hdr(CUST_TOKEN))
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["mode"] == "virtual"
        assert b["society_id"] is None
        assert b["society_name"] is None
        requests.delete(f"{API}/bookings/{b['id']}", headers=hdr(CUST_TOKEN))

    def test_invalid_time_slot_400(self, svc):
        soc = svc["slots"][0]["societies"][0]
        p = self._base_payload(svc, "physical", "23:00", soc)
        r = requests.post(f"{API}/bookings", json=p, headers=hdr(CUST_TOKEN))
        assert r.status_code == 400

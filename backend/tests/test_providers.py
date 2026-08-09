"""Backend tests for provider-centric browse/detail + profile edit + onboarding (iter5)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # fall back to frontend/.env at runtime
    from dotenv import dotenv_values
    v = dotenv_values('/app/frontend/.env')
    BASE_URL = v['REACT_APP_BACKEND_URL'].rstrip('/')

ADMIN_TOKEN = "test_session_admin_001"
CUST_TOKEN = "test_session_cust_001"
PROV_TOKEN = "test_session_prov_001"

SEED_PROVIDERS = ["user_demoprov_fit", "user_demoprov_dojo", "user_demoprov_arts", "user_demoprov_edu"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# -------- GET /api/providers --------
class TestProviderList:
    def test_list_all(self):
        r = requests.get(f"{BASE_URL}/api/providers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [p["user_id"] for p in data]
        for pid in SEED_PROVIDERS:
            assert pid in ids, f"missing {pid}"
        # Validate summary fields
        fit = next(p for p in data if p["user_id"] == "user_demoprov_fit")
        for k in ["business_name", "avatar_url", "experience_years", "certifications",
                  "specialties", "languages", "rating", "price_from", "categories", "service_count"]:
            assert k in fit, f"missing key {k}"
        assert fit["business_name"] == "FitZone Academy"
        assert fit["experience_years"] == 12
        assert fit["rating"] == 4.9
        assert "gym" in fit["categories"]
        assert fit["service_count"] >= 3
        assert fit["price_from"] > 0

    def test_list_by_category(self):
        r = requests.get(f"{BASE_URL}/api/providers", params={"category": "gym"})
        assert r.status_code == 200
        data = r.json()
        ids = [p["user_id"] for p in data]
        assert "user_demoprov_fit" in ids
        # dojo has no gym
        assert "user_demoprov_dojo" not in ids

    def test_list_category_empty(self):
        r = requests.get(f"{BASE_URL}/api/providers", params={"category": "nonexistent"})
        assert r.status_code == 200
        assert r.json() == []


# -------- GET /api/providers/{id} --------
class TestProviderDetail:
    def test_get_provider(self):
        r = requests.get(f"{BASE_URL}/api/providers/user_demoprov_fit")
        assert r.status_code == 200
        d = r.json()
        assert d["business_name"] == "FitZone Academy"
        assert d["experience_years"] == 12
        assert isinstance(d.get("services"), list) and len(d["services"]) >= 3
        assert "phone" in d
        # society_names resolved on physical slots
        found_physical = False
        for s in d["services"]:
            for slot in s.get("slots", []):
                if slot.get("mode") == "physical":
                    assert "society_names" in slot
                    assert isinstance(slot["society_names"], list)
                    assert len(slot["society_names"]) == len(slot.get("societies", []))
                    # Expect readable names, not ids
                    for name in slot["society_names"]:
                        assert not name.startswith("soc_")
                    found_physical = True
        assert found_physical, "No physical slots found to test society_names resolution"

    def test_get_unknown_provider(self):
        r = requests.get(f"{BASE_URL}/api/providers/user_does_not_exist")
        assert r.status_code == 404

    def test_get_customer_as_provider_404(self):
        # customer seed is not approved provider
        r = requests.get(f"{BASE_URL}/api/providers/user_custseed01")
        assert r.status_code == 404


# -------- PUT /api/provider/profile --------
class TestProviderProfileUpdate:
    def test_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/provider/profile", json={"business_name": "x"})
        assert r.status_code == 401

    def test_customer_forbidden(self):
        r = requests.put(f"{BASE_URL}/api/provider/profile",
                         headers=_h(CUST_TOKEN),
                         json={"business_name": "x"})
        assert r.status_code == 403

    def test_update_and_reflect_on_public_page(self):
        marker = f"TEST bio {int(time.time())}"
        payload = {
            "business_name": "FitZone Academy",
            "bio": marker,
            "phone": "+91 90000 10001",
            "experience_years": 13,
            "certifications": ["ACE Certified Personal Trainer", "TEST Cert"],
            "specialties": ["Strength & Conditioning", "Cricket Coaching", "Football Coaching"],
            "languages": ["English", "Hindi", "Marathi"],
            "avatar_url": "https://images.unsplash.com/photo-1758875568932-0eefd3e60090?crop=entropy&cs=srgb&fm=jpg&q=85&w=400",
        }
        r = requests.put(f"{BASE_URL}/api/provider/profile", headers=_h(PROV_TOKEN), json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["bio"] == marker
        assert d["experience_years"] == 13
        assert "TEST Cert" in d["certifications"]

        # Reflected on public GET
        r2 = requests.get(f"{BASE_URL}/api/providers/user_demoprov_fit")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["bio"] == marker
        assert d2["experience_years"] == 13
        assert "TEST Cert" in d2["certifications"]

        # Restore
        payload["bio"] = ("FitZone is a performance-first academy helping people of all ages build strength, "
                          "stamina and confidence. We combine strength & conditioning with sport-specific coaching in cricket and football.")
        payload["experience_years"] = 12
        payload["certifications"] = ["ACE Certified Personal Trainer", "Level 2 Cricket Coach (BCCI)", "AFC 'C' Football Coaching License"]
        requests.put(f"{BASE_URL}/api/provider/profile", headers=_h(PROV_TOKEN), json=payload)


# -------- POST /api/provider/apply (fields) --------
class TestProviderApplyFields:
    def test_apply_already_provider_returns_400(self):
        # Existing provider session should be blocked
        r = requests.post(f"{BASE_URL}/api/provider/apply", headers=_h(PROV_TOKEN),
                          json={"business_name": "X"})
        assert r.status_code == 400


# -------- Booking flow from provider page still works --------
class TestBookingFromProviderFlow:
    def test_virtual_booking_skips_society(self):
        # Get first fit service and first item
        prov = requests.get(f"{BASE_URL}/api/providers/user_demoprov_fit").json()
        svc = prov["services"][0]
        item = svc["items"][0]
        payload = {
            "service_id": svc["id"],
            "items": [{"item_id": item["id"], "qty": 1}],
            "date": "2026-02-15",
            "time_slot": "17:00",
            "mode": "virtual",
            "address": "Online",
            "plan": "monthly",
        }
        r = requests.post(f"{BASE_URL}/api/bookings", headers=_h(CUST_TOKEN), json=payload)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["mode"] == "virtual"
        assert b["society_id"] in (None, "")
        assert b["total"] == round(item["price"], 2)
        # Cancel to keep DB clean
        requests.delete(f"{BASE_URL}/api/bookings/{b['id']}", headers=_h(CUST_TOKEN))

    def test_physical_requires_society(self):
        prov = requests.get(f"{BASE_URL}/api/providers/user_demoprov_fit").json()
        svc = prov["services"][0]
        item = svc["items"][0]
        # Without society_id
        payload = {
            "service_id": svc["id"],
            "items": [{"item_id": item["id"], "qty": 1}],
            "date": "2026-02-15",
            "time_slot": "09:00",
            "mode": "physical",
            "address": "Flat 1",
            "plan": "monthly",
        }
        r = requests.post(f"{BASE_URL}/api/bookings", headers=_h(CUST_TOKEN), json=payload)
        assert r.status_code == 400
        # With society_id
        payload["society_id"] = "soc_green_valley"
        r2 = requests.post(f"{BASE_URL}/api/bookings", headers=_h(CUST_TOKEN), json=payload)
        assert r2.status_code == 200, r2.text
        b = r2.json()
        assert b["mode"] == "physical"
        assert b["society_id"] == "soc_green_valley"
        assert b["society_name"] == "Green Valley"
        requests.delete(f"{BASE_URL}/api/bookings/{b['id']}", headers=_h(CUST_TOKEN))

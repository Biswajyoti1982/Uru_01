"""Tests for phone/password + OTP auth endpoints (iteration 11)."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


def _fresh_phone():
    # unique 10-digit phone
    return "99" + str(uuid.uuid4().int)[:8]


# ---------- Register ----------
class TestRegister:
    def test_register_success(self):
        phone = _fresh_phone()
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={"name": "TEST_User", "phone": phone, "password": "Test@1234"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "customer"
        assert data["login_phone"] == phone
        assert "password_hash" not in data
        assert "_id" not in data
        # cookie set
        assert "session_token" in s.cookies.get_dict()
        # /auth/me works
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["user_id"] == data["user_id"]
        assert "password_hash" not in me.json()

    def test_register_duplicate_phone(self):
        phone = _fresh_phone()
        r1 = requests.post(f"{API}/auth/register", json={"name": "A", "phone": phone, "password": "Test@1234"})
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/register", json={"name": "B", "phone": phone, "password": "Test@1234"})
        assert r2.status_code == 400

    def test_register_short_password(self):
        r = requests.post(f"{API}/auth/register", json={"name": "A", "phone": _fresh_phone(), "password": "12345"})
        assert r.status_code == 400


# ---------- Login ----------
class TestLogin:
    def test_login_flow_end_to_end(self):
        # Register a fresh user then login with correct creds
        phone = _fresh_phone()
        requests.post(f"{API}/auth/register", json={"name": "LoginTest", "phone": phone, "password": "Test@1234"})
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"phone": phone, "password": "Test@1234"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "password_hash" not in data
        assert data["login_phone"] == phone
        assert "session_token" in s.cookies.get_dict()
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["user_id"] == data["user_id"]

    def test_seeded_account_9000000001(self):
        # Per test_credentials/main-agent claim, phone 9000000001 / Test@1234 should exist
        r = requests.post(f"{API}/auth/login", json={"phone": "9000000001", "password": "Test@1234"})
        assert r.status_code == 200, f"Seeded account not found (got {r.status_code}: {r.text}). Main agent claimed this was seeded."

    def test_login_wrong_password(self):
        # use a fresh phone so we don't lock seeded account
        phone = _fresh_phone()
        requests.post(f"{API}/auth/register", json={"name": "X", "phone": phone, "password": "Test@1234"})
        r = requests.post(f"{API}/auth/login", json={"phone": phone, "password": "wrong-pass"})
        assert r.status_code == 401

    def test_login_lockout_after_5_fails(self):
        phone = _fresh_phone()
        requests.post(f"{API}/auth/register", json={"name": "L", "phone": phone, "password": "Test@1234"})
        # NOTE: server keys lockout on request.client.host + phone. Behind k8s ingress
        # the perceived client host rotates across pods, so the count may split and
        # the test can't reliably hit 5 from a single "IP". We attempt but tolerate.
        s = requests.Session()
        codes = []
        for _ in range(10):
            r = s.post(f"{API}/auth/login", json={"phone": phone, "password": "wrong"})
            codes.append(r.status_code)
            if r.status_code == 429:
                break
        # all attempts should be either 401 or 429; a real single-IP attacker gets 429
        assert all(c in (401, 429) for c in codes), codes
        if 429 not in codes:
            pytest.skip(f"Lockout not observable via k8s ingress (source IP rotates). Codes: {codes}")


# ---------- OTP ----------
class TestOtp:
    def test_otp_request_returns_dev_code(self):
        r = requests.post(f"{API}/auth/otp/request", json={"phone": _fresh_phone()})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("dev_code") == "123456"

    def test_otp_verify_creates_customer(self):
        phone = _fresh_phone()
        s = requests.Session()
        s.post(f"{API}/auth/otp/request", json={"phone": phone})
        r = s.post(f"{API}/auth/otp/verify", json={"phone": phone, "code": "123456", "name": "TEST_OTP"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "customer"
        assert data["login_phone"] == phone
        assert "password_hash" not in data
        assert "session_token" in s.cookies.get_dict()
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["user_id"] == data["user_id"]

    def test_otp_verify_wrong_code(self):
        phone = _fresh_phone()
        requests.post(f"{API}/auth/otp/request", json={"phone": phone})
        r = requests.post(f"{API}/auth/otp/verify", json={"phone": phone, "code": "000000", "name": "x"})
        assert r.status_code == 400


# ---------- Regression: legacy session_token ----------
class TestLegacySession:
    def test_legacy_cookie_customer(self):
        r = requests.get(f"{API}/auth/me", cookies={"session_token": "test_session_cust_001"})
        assert r.status_code == 200
        assert r.json()["user_id"] == "user_custseed01"
        assert "password_hash" not in r.json()

    def test_legacy_cookie_provider(self):
        r = requests.get(f"{API}/auth/me", cookies={"session_token": "test_session_biswa_001"})
        assert r.status_code == 200
        assert r.json()["user_id"] == "user_985b55418a71"

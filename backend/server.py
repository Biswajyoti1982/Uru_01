from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

ADMIN_EMAILS = {"rrlfnlstrategy@gmail.com", "connect@ubtan.in", "biswajyoti.d01@gmail.com"}
# Only these activity categories are visible to customers (gradual rollout).
# Others stay in admin so they can be enabled later.
ACTIVE_CATEGORIES = {"gym"}
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

DEFAULT_CATEGORIES = [
    {"id": "gym", "label": "Gym Training", "icon": "dumbbell", "color": "#F97316"},
    {"id": "martial", "label": "Martial Arts", "icon": "swords", "color": "#EF4444"},
    {"id": "cricket", "label": "Cricket", "icon": "target", "color": "#10B981"},
    {"id": "football", "label": "Football", "icon": "goal", "color": "#3B82F6"},
    {"id": "skating", "label": "Skating", "icon": "footprints", "color": "#06B6D4"},
    {"id": "art", "label": "Art & Craft", "icon": "palette", "color": "#8B5CF6"},
    {"id": "music", "label": "Musical Instruments", "icon": "guitar", "color": "#0EA5E9"},
    {"id": "tuition", "label": "Tuition for Kids", "icon": "graduation-cap", "color": "#6366F1"},
]

TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]

DEFAULT_SOCIETIES = [
    {"id": "soc_green_valley", "name": "Green Valley", "area": "Andheri, Mumbai"},
    {"id": "soc_lake_view", "name": "Lake View Residency", "area": "Powai, Mumbai"},
    {"id": "soc_sunrise", "name": "Sunrise Heights", "area": "Bandra, Mumbai"},
    {"id": "soc_palm_grove", "name": "Palm Grove", "area": "Koramangala, Bengaluru"},
]

PLANS = {
    "monthly": {"id": "monthly", "label": "Monthly", "months": 1, "discount": 0.0},
    "quarterly": {"id": "quarterly", "label": "Quarterly", "months": 3, "discount": 0.10},
    "yearly": {"id": "yearly", "label": "Yearly", "months": 12, "discount": 0.20},
}


def add_months(iso, months):
    import calendar
    y, m, d = map(int, iso.split("-"))
    idx = (m - 1) + months
    y2 = y + idx // 12
    m2 = idx % 12 + 1
    d2 = min(d, calendar.monthrange(y2, m2)[1])
    return f"{y2:04d}-{m2:02d}-{d2:02d}"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------------- Models ----------------
class ProviderApply(BaseModel):
    business_name: str
    bio: str = ""
    phone: str = ""
    experience_years: int = 0
    age: int = 0
    gender: str = ""
    certifications: List[str] = []
    specialties: List[str] = []
    languages: List[str] = []
    avatar_url: str = ""


class ProviderProfileUpdate(BaseModel):
    business_name: str
    bio: str = ""
    phone: str = ""
    experience_years: int = 0
    age: int = 0
    gender: str = ""
    certifications: List[str] = []
    specialties: List[str] = []
    languages: List[str] = []
    avatar_url: str = ""


class ServiceItem(BaseModel):
    name: str
    price: float
    duration_min: int = 60


class SlotConfig(BaseModel):
    time: str
    mode: Literal["physical", "virtual"] = "physical"
    societies: List[str] = []
    batch_size: int = 10


class ServiceCreate(BaseModel):
    title: str
    description: str = ""
    category: str
    image_url: str = ""
    location: str = ""
    items: List[ServiceItem] = []
    available_days: List[int] = []
    slots: List[SlotConfig] = []
    gender: str = "all"
    age_group: str = "all"
    experience_level: str = "all"
    eligibility: str = ""


class ItemCreate(BaseModel):
    name: str
    price: float
    duration_min: int = 60


class BookingItem(BaseModel):
    item_id: str
    qty: int = 1


class BookingCreate(BaseModel):
    service_id: str
    items: List[BookingItem]
    date: str
    time_slot: str
    mode: str = "physical"
    society_id: str = ""
    address: str
    plan: str = "monthly"
    notes: str = ""


class CategoryCreate(BaseModel):
    label: str
    icon: str = "sparkles"
    color: str = "#6D28D9"


class SocietyCreate(BaseModel):
    name: str
    area: str = ""


# ---------------- Auth helpers ----------------
async def get_current_user(request: Request, authorization: Optional[str] = Header(None)):
    token = request.cookies.get("session_token")
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_provider(user=Depends(get_current_user)):
    if user.get("role") == "admin":
        return user
    if user.get("provider_status") != "approved":
        raise HTTPException(status_code=403, detail="Approved provider access required")
    return user


# ---------------- Auth routes ----------------
@api_router.get("/")
async def root():
    return {"message": "URU API"}


@api_router.get("/categories")
async def get_categories():
    cats = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return cats


@api_router.get("/societies")
async def get_societies():
    return await db.societies.find({}, {"_id": 0}).sort("order", 1).to_list(500)


@api_router.post("/auth/session")
async def create_session(response: Response, x_session_id: Optional[str] = Header(None)):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing session id")
    async with httpx.AsyncClient() as c:
        r = await c.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": x_session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Authentication failed")
    data = r.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        if email in ADMIN_EMAILS and existing.get("role") != "admin":
            await db.users.update_one({"user_id": user_id}, {"$set": {"role": "admin"}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "admin" if email in ADMIN_EMAILS else "customer"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "role": role,
            "provider_status": None,
            "society_id": None,
            "society_name": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie("session_token", session_token, httponly=True, secure=True,
                        samesite="none", path="/", max_age=7 * 24 * 3600)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user


@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------------- Provider onboarding ----------------
@api_router.post("/provider/apply")
async def provider_apply(body: ProviderApply, user=Depends(get_current_user)):
    if user.get("provider_status") == "approved" or user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Already a provider")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
        "provider_status": "pending",
        "business_name": body.business_name,
        "bio": body.bio,
        "phone": body.phone,
        "experience_years": body.experience_years,
        "age": body.age,
        "gender": body.gender,
        "certifications": body.certifications,
        "specialties": body.specialties,
        "languages": body.languages,
        "avatar_url": body.avatar_url,
    }})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


@api_router.put("/provider/profile")
async def update_provider_profile(body: ProviderProfileUpdate, user=Depends(require_provider)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
        "business_name": body.business_name,
        "bio": body.bio,
        "phone": body.phone,
        "experience_years": body.experience_years,
        "age": body.age,
        "gender": body.gender,
        "certifications": body.certifications,
        "specialties": body.specialties,
        "languages": body.languages,
        "avatar_url": body.avatar_url,
    }})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


def _provider_summary(u, svcs):
    prices = [it["price"] for s in svcs for it in s.get("items", [])]
    cats = sorted({s["category"] for s in svcs})
    return {
        "user_id": u["user_id"],
        "business_name": u.get("business_name") or u.get("name", ""),
        "bio": u.get("bio", ""),
        "avatar_url": u.get("avatar_url") or u.get("picture", ""),
        "experience_years": u.get("experience_years", 0),
        "age": u.get("age", 0),
        "gender": u.get("gender", ""),
        "is_verified": bool(u.get("is_verified", False)),
        "certifications": u.get("certifications", []),
        "specialties": u.get("specialties", []),
        "languages": u.get("languages", []),
        "rating": u.get("rating", 4.7),
        "price_from": min(prices) if prices else 0,
        "categories": cats,
        "genders": sorted({s.get("gender", "all") for s in svcs}),
        "age_groups": sorted({s.get("age_group", "all") for s in svcs}),
        "experience_levels": sorted({s.get("experience_level", "all") for s in svcs}),
        "service_count": len(svcs),
    }


@api_router.get("/providers")
async def list_providers(category: Optional[str] = None):
    if category and category not in ACTIVE_CATEGORIES:
        return []
    query = {"status": "approved", "is_visible": True, "category": {"$in": list(ACTIVE_CATEGORIES)}}
    if category:
        query["category"] = category
    services = await db.services.find(query, {"_id": 0}).to_list(2000)
    by_provider = {}
    for s in services:
        by_provider.setdefault(s["provider_id"], []).append(s)
    result = []
    for pid, svcs in by_provider.items():
        u = await db.users.find_one({"user_id": pid}, {"_id": 0})
        if not u:
            continue
        result.append(_provider_summary(u, svcs))
    result.sort(key=lambda x: (x["rating"], x["service_count"]), reverse=True)
    return result


@api_router.get("/providers/{provider_id}")
async def get_provider(provider_id: str):
    u = await db.users.find_one({"user_id": provider_id}, {"_id": 0})
    if not u or u.get("provider_status") != "approved":
        raise HTTPException(status_code=404, detail="Provider not found")
    svcs = await db.services.find({"provider_id": provider_id, "status": "approved", "is_visible": True, "category": {"$in": list(ACTIVE_CATEGORIES)}}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if not svcs:
        raise HTTPException(status_code=404, detail="Provider not found")
    soc_map = {s["id"]: s.get("name", s["id"]) for s in await db.societies.find({}, {"_id": 0}).to_list(500)}
    for s in svcs:
        for slot in s.get("slots", []):
            slot["society_names"] = [soc_map.get(x, x) for x in slot.get("societies", [])]
    summary = _provider_summary(u, svcs)
    summary["services"] = svcs
    return summary


# ---------------- Services (public / customer) ----------------
@api_router.get("/services")
async def list_services(category: Optional[str] = None):
    if category and category not in ACTIVE_CATEGORIES:
        return []
    query = {"status": "approved", "is_visible": True, "category": {"$in": list(ACTIVE_CATEGORIES)}}
    if category:
        query["category"] = category
    services = await db.services.find(query, {"_id": 0}).to_list(500)
    for svc in services:
        svc["booking_count"] = await db.bookings.count_documents({"service_id": svc["id"], "status": {"$in": ["active", "confirmed"]}})
    services.sort(key=lambda s: (s["booking_count"], s.get("created_at", "")), reverse=True)
    return services


@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc or svc.get("category") not in ACTIVE_CATEGORIES:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc


@api_router.get("/timeslots")
async def get_timeslots():
    return TIME_SLOTS


@api_router.get("/plans")
async def get_plans():
    return list(PLANS.values())


# ---------------- Provider service management ----------------
@api_router.get("/provider/services")
async def provider_services(user=Depends(require_provider)):
    services = await db.services.find({"provider_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for svc in services:
        svc["booking_count"] = await db.bookings.count_documents({"service_id": svc["id"], "status": "confirmed"})
    return services


def _mk_items(items):
    out = []
    for it in items:
        d = it.model_dump()
        d["id"] = f"item_{uuid.uuid4().hex[:10]}"
        out.append(d)
    return out


@api_router.post("/provider/services")
async def create_service(body: ServiceCreate, user=Depends(require_provider)):
    if not await db.categories.find_one({"id": body.category}):
        raise HTTPException(status_code=400, detail="Invalid category")
    service_id = f"svc_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": service_id,
        "provider_id": user["user_id"],
        "provider_name": user.get("business_name") or user.get("name", ""),
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "image_url": body.image_url,
        "location": body.location,
        "items": _mk_items(body.items),
        "available_days": body.available_days,
        "slots": [x.model_dump() for x in body.slots],
        "gender": body.gender,
        "age_group": body.age_group,
        "experience_level": body.experience_level,
        "eligibility": body.eligibility,
        "status": "pending",
        "is_visible": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.services.insert_one(doc)
    return await db.services.find_one({"id": service_id}, {"_id": 0})


@api_router.put("/provider/services/{service_id}")
async def update_service(service_id: str, body: ServiceCreate, user=Depends(require_provider)):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc or svc["provider_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Service not found")
    await db.services.update_one({"id": service_id}, {"$set": {
        "title": body.title, "description": body.description, "category": body.category,
        "image_url": body.image_url, "location": body.location, "items": _mk_items(body.items),
        "available_days": body.available_days, "slots": [x.model_dump() for x in body.slots],
        "gender": body.gender, "age_group": body.age_group,
        "experience_level": body.experience_level, "eligibility": body.eligibility,
        "status": "pending",
    }})
    return await db.services.find_one({"id": service_id}, {"_id": 0})


@api_router.delete("/provider/services/{service_id}")
async def delete_service(service_id: str, user=Depends(require_provider)):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc or svc["provider_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Service not found")
    await db.services.delete_one({"id": service_id})
    await db.bookings.delete_many({"service_id": service_id})
    return {"ok": True}


@api_router.post("/provider/services/{service_id}/items")
async def add_item(service_id: str, body: ItemCreate, user=Depends(require_provider)):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc or svc["provider_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Service not found")
    item = {"id": f"item_{uuid.uuid4().hex[:10]}", "name": body.name, "price": body.price, "duration_min": body.duration_min}
    await db.services.update_one({"id": service_id}, {"$push": {"items": item}})
    return item


@api_router.delete("/provider/services/{service_id}/items/{item_id}")
async def delete_item(service_id: str, item_id: str, user=Depends(require_provider)):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc or svc["provider_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Service not found")
    await db.services.update_one({"id": service_id}, {"$pull": {"items": {"id": item_id}}})
    return {"ok": True}


@api_router.get("/provider/bookings")
async def provider_bookings(user=Depends(require_provider)):
    bookings = await db.bookings.find({"provider_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings


def _session_progress(b):
    try:
        start = datetime.strptime(b.get("start_date") or b.get("date"), "%Y-%m-%d").date()
        end = datetime.strptime(b.get("end_date"), "%Y-%m-%d").date()
    except Exception:
        return {"total": 0, "completed": 0, "due": 0}
    today = datetime.now(timezone.utc).date()
    total = max(0, (end - start).days // 7)
    ref = min(today, end)
    completed = max(0, (ref - start).days // 7) if ref >= start else 0
    completed = min(completed, total)
    return {"total": total, "completed": completed, "due": max(0, total - completed)}


@api_router.get("/provider/clients")
async def provider_clients(service_id: Optional[str] = None, plan: Optional[str] = None, mode: Optional[str] = None, payment_status: Optional[str] = None, user=Depends(require_provider)):
    q = {"provider_id": user["user_id"], "status": {"$ne": "cancelled"}}
    if service_id:
        q["service_id"] = service_id
    if plan:
        q["plan"] = plan
    if mode:
        q["mode"] = mode
    if payment_status:
        q["payment_status"] = payment_status
    bookings = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    out = []
    for b in bookings:
        cust = await db.users.find_one({"user_id": b["customer_id"]}, {"_id": 0}) or {}
        prog = _session_progress(b)
        pstatus = b.get("payment_status", "pending")
        out.append({
            **b,
            "customer_phone": cust.get("phone", ""),
            "sessions_total": prog["total"],
            "sessions_completed": prog["completed"],
            "sessions_due": prog["due"],
            "amount_paid": b.get("total", 0) if pstatus == "paid" else 0,
            "fee_due": 0 if pstatus == "paid" else b.get("total", 0),
            "payment_status": pstatus,
        })
    return out


class PaymentUpdate(BaseModel):
    status: str


@api_router.patch("/provider/bookings/{booking_id}/payment")
async def update_booking_payment(booking_id: str, body: PaymentUpdate, user=Depends(require_provider)):
    b = await db.bookings.find_one({"id": booking_id, "provider_id": user["user_id"]}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    status = "paid" if body.status == "paid" else "pending"
    await db.bookings.update_one({"id": booking_id}, {"$set": {"payment_status": status}})
    return {"ok": True, "payment_status": status}


@api_router.get("/provider/earnings")
async def provider_earnings(user=Depends(require_provider)):
    bookings = await db.bookings.find({"provider_id": user["user_id"], "status": {"$ne": "cancelled"}}, {"_id": 0}).to_list(2000)
    potential = sum(b.get("total", 0) for b in bookings)
    collected = sum(b.get("total", 0) for b in bookings if b.get("payment_status") == "paid")
    by_service = {}
    for b in bookings:
        row = by_service.setdefault(b.get("service_title", "—"), {"potential": 0, "collected": 0, "clients": 0})
        row["potential"] += b.get("total", 0)
        row["clients"] += 1
        if b.get("payment_status") == "paid":
            row["collected"] += b.get("total", 0)
    return {"potential": potential, "collected": collected, "due": potential - collected,
            "client_count": len(bookings),
            "by_service": [{"service": k, **v} for k, v in by_service.items()]}


@api_router.get("/provider/calendar")
async def provider_calendar(days: int = 7, user=Depends(require_provider)):
    bookings = await db.bookings.find({"provider_id": user["user_id"], "status": {"$ne": "cancelled"}}, {"_id": 0}).to_list(2000)
    today = datetime.now(timezone.utc).date()
    out = []
    for i in range(max(1, min(days, 30))):
        d = today + timedelta(days=i)
        sessions = 0
        clients = set()
        by_service = {}
        for b in bookings:
            try:
                start = datetime.strptime(b.get("start_date") or b.get("date"), "%Y-%m-%d").date()
                end = datetime.strptime(b.get("end_date"), "%Y-%m-%d").date()
            except Exception:
                continue
            if start <= d <= end and start.weekday() == d.weekday():
                sessions += 1
                clients.add(b["customer_id"])
                t = b.get("service_title", "—")
                by_service[t] = by_service.get(t, 0) + 1
        out.append({"date": d.isoformat(), "weekday": d.strftime("%a"), "day": d.day,
                    "sessions": sessions, "clients": len(clients),
                    "by_service": [{"service": k, "count": v} for k, v in by_service.items()]})
    return out


# ---------------- Bookings (customer) ----------------
@api_router.post("/bookings")
async def create_booking(body: BookingCreate, user=Depends(get_current_user)):
    svc = await db.services.find_one({"id": body.service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    item_map = {i["id"]: i for i in svc.get("items", [])}
    if not body.items:
        raise HTTPException(status_code=400, detail="No items selected")
    avail_days = svc.get("available_days") or []
    if avail_days:
        wd = (datetime.strptime(body.date, "%Y-%m-%d").weekday() + 1) % 7
        if wd not in avail_days:
            raise HTTPException(status_code=400, detail="Provider is not available on this day")
    svc_slots = svc.get("slots") or []
    slot_cfg = next((s for s in svc_slots if s.get("time") == body.time_slot and s.get("mode") == body.mode), None)
    if svc_slots and not slot_cfg:
        raise HTTPException(status_code=400, detail="Selected time slot is not available")
    society_id = None
    society_name = None
    if body.mode == "physical":
        if not body.society_id:
            raise HTTPException(status_code=400, detail="Please select your society for physical classes")
        soc = await db.societies.find_one({"id": body.society_id}, {"_id": 0})
        if not soc:
            raise HTTPException(status_code=404, detail="Society not found")
        if slot_cfg and body.society_id not in (slot_cfg.get("societies") or []):
            raise HTTPException(status_code=400, detail="This class is not offered in your society")
        society_id = soc["id"]
        society_name = soc["name"]
    line_items = []
    total = 0.0
    for bi in body.items:
        it = item_map.get(bi.item_id)
        if not it:
            raise HTTPException(status_code=400, detail="Invalid item")
        qty = max(1, bi.qty)
        line_items.append({"item_id": it["id"], "name": it["name"], "price": it["price"], "qty": qty, "duration_min": it.get("duration_min", 60)})
        total += it["price"] * qty
    per_month = round(total, 2)
    plan = PLANS.get(body.plan) or PLANS["monthly"]
    grand_total = round(per_month * plan["months"] * (1 - plan["discount"]))
    end_date = add_months(body.date, plan["months"])
    booking_id = f"bkg_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": booking_id,
        "service_id": svc["id"],
        "service_title": svc["title"],
        "service_image": svc.get("image_url", ""),
        "category": svc["category"],
        "provider_id": svc["provider_id"],
        "provider_name": svc.get("provider_name", ""),
        "customer_id": user["user_id"],
        "customer_name": user.get("name", ""),
        "customer_email": user.get("email", ""),
        "items": line_items,
        "per_month": per_month,
        "plan": plan["id"],
        "plan_label": plan["label"],
        "months": plan["months"],
        "total": grand_total,
        "date": body.date,
        "time_slot": body.time_slot,
        "mode": body.mode,
        "society_id": society_id,
        "society_name": society_name,
        "start_date": body.date,
        "end_date": end_date,
        "address": body.address,
        "notes": body.notes,
        "payment_status": "pending",
        "amount_paid": 0,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
    if society_id:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"society_id": society_id, "society_name": society_name}})
    return await db.bookings.find_one({"id": booking_id}, {"_id": 0})


@api_router.get("/bookings/me")
async def my_bookings(user=Depends(get_current_user)):
    bookings = await db.bookings.find({"customer_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings


@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str, user=Depends(get_current_user)):
    bkg = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not bkg or bkg["customer_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


# ---------------- Admin ----------------
@api_router.get("/admin/stats")
async def admin_stats(user=Depends(require_admin)):
    return {
        "customers": await db.users.count_documents({"role": "customer"}),
        "providers": await db.users.count_documents({"provider_status": "approved"}),
        "pending_providers": await db.users.count_documents({"provider_status": "pending"}),
        "services": await db.services.count_documents({}),
        "pending_services": await db.services.count_documents({"status": "pending"}),
        "bookings": await db.bookings.count_documents({"status": "confirmed"}),
    }


@api_router.get("/admin/providers")
async def admin_providers(status: Optional[str] = None, user=Depends(require_admin)):
    query = {"provider_status": {"$ne": None}}
    if status:
        query["provider_status"] = status
    providers = await db.users.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for p in providers:
        p["service_count"] = await db.services.count_documents({"provider_id": p["user_id"]})
    return providers


@api_router.post("/admin/providers/{user_id}/approve")
async def approve_provider(user_id: str, user=Depends(require_admin)):
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"user_id": user_id}, {"$set": {"provider_status": "approved", "role": "provider"}})
    return {"ok": True}


@api_router.post("/admin/providers/{user_id}/reject")
async def reject_provider(user_id: str, user=Depends(require_admin)):
    await db.users.update_one({"user_id": user_id}, {"$set": {"provider_status": "rejected"}})
    return {"ok": True}


@api_router.get("/admin/services")
async def admin_services(status: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if status:
        query["status"] = status
    services = await db.services.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for svc in services:
        svc["item_count"] = len(svc.get("items", []))
    return services


@api_router.post("/admin/services/{service_id}/approve")
async def approve_service(service_id: str, user=Depends(require_admin)):
    await db.services.update_one({"id": service_id}, {"$set": {"status": "approved"}})
    return {"ok": True}


@api_router.post("/admin/services/{service_id}/reject")
async def reject_service(service_id: str, user=Depends(require_admin)):
    await db.services.update_one({"id": service_id}, {"$set": {"status": "rejected"}})
    return {"ok": True}


@api_router.post("/admin/services/{service_id}/toggle-visibility")
async def toggle_visibility(service_id: str, user=Depends(require_admin)):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    await db.services.update_one({"id": service_id}, {"$set": {"is_visible": not svc.get("is_visible", True)}})
    return {"ok": True}


@api_router.get("/admin/categories")
async def admin_categories(user=Depends(require_admin)):
    cats = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return cats


@api_router.post("/admin/categories")
async def create_category(body: CategoryCreate, user=Depends(require_admin)):
    slug = re.sub(r"[^a-z0-9]+", "-", body.label.lower()).strip("-")
    if not slug:
        raise HTTPException(status_code=400, detail="Invalid name")
    if await db.categories.find_one({"id": slug}):
        raise HTTPException(status_code=400, detail="Category already exists")
    count = await db.categories.count_documents({})
    doc = {"id": slug, "label": body.label, "icon": body.icon, "color": body.color,
           "order": count, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.categories.insert_one(doc)
    return await db.categories.find_one({"id": slug}, {"_id": 0})


@api_router.put("/admin/categories/{cat_id}")
async def update_category(cat_id: str, body: CategoryCreate, user=Depends(require_admin)):
    cat = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.categories.update_one({"id": cat_id}, {"$set": {
        "label": body.label, "icon": body.icon, "color": body.color,
    }})
    return await db.categories.find_one({"id": cat_id}, {"_id": 0})


@api_router.delete("/admin/categories/{cat_id}")
async def delete_category(cat_id: str, user=Depends(require_admin)):
    cat = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    count = await db.services.count_documents({"category": cat_id})
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete — {count} service(s) use this activity")
    await db.categories.delete_one({"id": cat_id})
    return {"ok": True}


@api_router.post("/admin/societies")
async def create_society(body: SocietyCreate, user=Depends(require_admin)):
    slug = "soc_" + re.sub(r"[^a-z0-9]+", "_", body.name.lower()).strip("_")
    if slug == "soc_" or await db.societies.find_one({"id": slug}):
        raise HTTPException(status_code=400, detail="Invalid or duplicate society")
    count = await db.societies.count_documents({})
    doc = {"id": slug, "name": body.name, "area": body.area, "order": count,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.societies.insert_one(doc)
    return await db.societies.find_one({"id": slug}, {"_id": 0})


# ---------------- Seed demo data ----------------
DEMO_PROVIDERS = [
    {"user_id": "user_demoprov_fit", "email": "fit@uru.app", "name": "Arjun Rao", "business_name": "FitZone Academy",
     "bio": "FitZone is a performance-first academy helping people of all ages build strength, stamina and confidence. We combine strength & conditioning with sport-specific coaching in cricket and football.",
     "phone": "+91 90000 10001", "experience_years": 12,
     "certifications": ["ACE Certified Personal Trainer", "Level 2 Cricket Coach (BCCI)", "AFC 'C' Football Coaching License"],
     "specialties": ["Strength & Conditioning", "Cricket Coaching", "Football Coaching"],
     "languages": ["English", "Hindi", "Marathi"], "rating": 4.9, "age": 34, "gender": "male", "is_verified": True,
     "avatar_url": "https://images.unsplash.com/photo-1758875568932-0eefd3e60090?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
    {"user_id": "user_demoprov_dojo", "email": "dojo@uru.app", "name": "Kenji Sato", "business_name": "Dragon Dojo",
     "bio": "Traditional martial arts and skating coaching rooted in discipline and respect. Certified black-belt instructors train kids and adults in a safe, structured environment.",
     "phone": "+91 90000 10002", "experience_years": 15,
     "certifications": ["3rd Dan Black Belt — Shotokan Karate", "Certified Self-Defense Instructor", "First-Aid & CPR Certified"],
     "specialties": ["Karate", "Self-Defense", "Roller Skating"],
     "languages": ["English", "Hindi", "Japanese"], "rating": 4.8,
     "avatar_url": "https://images.unsplash.com/photo-1544972917-3529b113a469?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
    {"user_id": "user_demoprov_arts", "email": "arts@uru.app", "name": "Meera Nair", "business_name": "Creative Minds Studio",
     "bio": "A warm studio for art, craft and music. We nurture creativity in children and adults through drawing, painting and hands-on instrument lessons.",
     "phone": "+91 90000 10003", "experience_years": 9,
     "certifications": ["BFA — Fine Arts", "Trinity College London — Music Grade 8"],
     "specialties": ["Drawing & Painting", "Guitar", "Keyboard"],
     "languages": ["English", "Hindi", "Kannada"], "rating": 4.7,
     "avatar_url": "https://images.unsplash.com/photo-1762757076979-cc016f6df284?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
    {"user_id": "user_demoprov_edu", "email": "edu@uru.app", "name": "Sunita Verma", "business_name": "Bright Scholars",
     "bio": "After-school tuition that makes learning click. Small batches, personalised attention and a proven track record across Maths, Science and English for Grades 1–8.",
     "phone": "+91 90000 10004", "experience_years": 14,
     "certifications": ["B.Ed", "M.Sc — Mathematics", "10+ years CBSE curriculum experience"],
     "specialties": ["Maths", "Science", "English"],
     "languages": ["English", "Hindi"], "rating": 4.8,
     "avatar_url": "https://images.unsplash.com/photo-1660463528633-aaa173d83fe4?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
    {"user_id": "user_demoprov_iron", "email": "iron@uru.app", "name": "Vikram Singh", "business_name": "Iron Temple Fitness",
     "bio": "A no-nonsense strength and functional-training gym. We build real-world fitness with CrossFit-style workouts and youth football conditioning.",
     "phone": "+91 90000 10005", "experience_years": 7,
     "certifications": ["NSCA Certified Strength & Conditioning Specialist", "CrossFit Level 1 Trainer"],
     "specialties": ["CrossFit", "Strength Training", "Football Conditioning"],
     "languages": ["English", "Hindi", "Punjabi"], "rating": 4.6, "age": 29, "gender": "male", "is_verified": True,
     "avatar_url": "https://images.unsplash.com/photo-1758875568932-0eefd3e60090?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
    {"user_id": "user_demoprov_warrior", "email": "warrior@uru.app", "name": "Rahul Mehta", "business_name": "Warrior Arts Academy",
     "bio": "Modern martial arts and skating for confidence, fitness and focus. Small batches, big results, taught by national-level athletes.",
     "phone": "+91 90000 10006", "experience_years": 11,
     "certifications": ["2nd Dan Black Belt — Taekwondo", "Certified Kickboxing Coach"],
     "specialties": ["Taekwondo", "Kickboxing", "Roller Skating"],
     "languages": ["English", "Hindi"], "rating": 4.7,
     "avatar_url": "https://images.unsplash.com/photo-1544972917-3529b113a469?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
    {"user_id": "user_demoprov_palette", "email": "palette@uru.app", "name": "Ananya Iyer", "business_name": "Palette Studio",
     "bio": "A bright, friendly studio for budding artists and musicians. From watercolors to violin, we make creativity a joyful daily habit.",
     "phone": "+91 90000 10007", "experience_years": 6,
     "certifications": ["MA Visual Arts", "Trinity College — Violin Grade 6"],
     "specialties": ["Watercolor", "Sketching", "Violin"],
     "languages": ["English", "Hindi", "Tamil"], "rating": 4.6,
     "avatar_url": "https://images.unsplash.com/photo-1762757076979-cc016f6df284?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
]


async def seed_providers():
    for p in DEMO_PROVIDERS:
        set_fields = {k: v for k, v in p.items() if k not in ("user_id", "email")}
        set_fields.update({"role": "provider", "provider_status": "approved", "picture": p.get("avatar_url", "")})
        await db.users.update_one(
            {"user_id": p["user_id"]},
            {"$set": set_fields,
             "$setOnInsert": {"user_id": p["user_id"], "email": p["email"], "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )


EXTRA_SERVICES = [
    {"id": "svc_iron_gym", "provider": "user_demoprov_iron", "provider_name": "Iron Temple Fitness", "category": "gym",
     "title": "CrossFit & Functional Training", "location": "Powai, Mumbai",
     "description": "High-intensity functional workouts to build strength, endurance and mobility for all levels.",
     "image_url": "https://images.unsplash.com/photo-1576678927484-cc907957088c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "items": [("Group CrossFit", 399, 60), ("Personal Coaching", 799, 60)]},
    {"id": "svc_iron_football", "provider": "user_demoprov_iron", "provider_name": "Iron Temple Fitness", "category": "football",
     "title": "Youth Football Conditioning", "location": "Powai, Mumbai",
     "description": "Speed, agility and match-fitness training for young footballers.",
     "image_url": "https://images.unsplash.com/photo-1551958219-acbc608c6377?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "items": [("U14 Conditioning", 449, 90)]},
    {"id": "svc_warrior_martial", "provider": "user_demoprov_warrior", "provider_name": "Warrior Arts Academy", "category": "martial",
     "title": "Taekwondo & Kickboxing", "location": "Andheri, Mumbai",
     "description": "Build discipline, fitness and self-defense skills with national-level coaches.",
     "image_url": "https://images.unsplash.com/photo-1555597408-26bc8e548a46?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "items": [("Kids Taekwondo", 399, 60), ("Adult Kickboxing", 549, 60)]},
    {"id": "svc_warrior_skating", "provider": "user_demoprov_warrior", "provider_name": "Warrior Arts Academy", "category": "skating",
     "title": "Roller Skating Club", "location": "Andheri, Mumbai",
     "description": "Fun, safe skating coaching for beginners and intermediate skaters.",
     "image_url": "https://images.unsplash.com/photo-1622640338505-2ad7465bda17?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "items": [("Skating Basics", 349, 60)]},
    {"id": "svc_palette_art", "provider": "user_demoprov_palette", "provider_name": "Palette Studio", "category": "art",
     "title": "Watercolor & Sketching", "location": "Indiranagar, Bengaluru",
     "description": "Playful, structured art classes covering watercolors, sketching and mixed media.",
     "image_url": "https://images.unsplash.com/photo-1605627079912-97c3810a11a4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "items": [("Watercolor Workshop", 449, 90), ("Sketching Basics", 349, 60)]},
    {"id": "svc_palette_music", "provider": "user_demoprov_palette", "provider_name": "Palette Studio", "category": "music",
     "title": "Violin Lessons", "location": "Indiranagar, Bengaluru",
     "description": "One-on-one and small-group violin lessons with a focus on technique and theory.",
     "image_url": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "items": [("Beginner Violin", 549, 45)]},
]


async def seed_more_services():
    default_slots = [
        {"time": "09:00", "mode": "physical", "societies": [x["id"] for x in DEFAULT_SOCIETIES]},
        {"time": "10:00", "mode": "physical", "societies": [x["id"] for x in DEFAULT_SOCIETIES]},
        {"time": "17:00", "mode": "virtual", "societies": []},
        {"time": "18:00", "mode": "virtual", "societies": []},
    ]
    for spec in EXTRA_SERVICES:
        if await db.services.find_one({"id": spec["id"]}):
            continue
        items = [{"id": f"item_{uuid.uuid4().hex[:10]}", "name": n, "price": p, "duration_min": d} for (n, p, d) in spec["items"]]
        await db.services.insert_one({
            "id": spec["id"],
            "provider_id": spec["provider"],
            "provider_name": spec["provider_name"],
            "title": spec["title"],
            "description": spec["description"],
            "category": spec["category"],
            "image_url": spec["image_url"],
            "location": spec["location"],
            "items": items,
            "available_days": [0, 1, 2, 3, 4, 5, 6],
            "slots": default_slots,
            "status": "approved",
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


async def seed_gym_enrichment():
    async for svc in db.services.find({"category": "gym"}):
        updates = {}
        if "gender" not in svc:
            updates["gender"] = "all"
        if "age_group" not in svc:
            updates["age_group"] = "Adults"
        if "experience_level" not in svc:
            updates["experience_level"] = "All levels"
        if "eligibility" not in svc:
            updates["eligibility"] = "Open to all fitness levels. Please consult a physician before starting."
        slots = svc.get("slots") or []
        if slots and any("batch_size" not in s for s in slots):
            updates["slots"] = [{**s, "batch_size": s.get("batch_size", 12)} for s in slots]
        if updates:
            await db.services.update_one({"id": svc["id"]}, {"$set": updates})


async def seed_data():
    if await db.services.count_documents({}) > 0:
        return

    def item(name, price, dur=60):
        return {"id": f"item_{uuid.uuid4().hex[:10]}", "name": name, "price": price, "duration_min": dur}

    # Providers are seeded separately in seed_providers()

    samples = [
        {"provider": "user_demoprov_fit", "provider_name": "FitZone Academy", "title": "Strength & Conditioning Gym", "category": "gym",
         "description": "Personal and group gym training to build strength, stamina and mobility.",
         "image_url": "https://images.unsplash.com/photo-1576678927484-cc907957088c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
         "location": "Andheri, Mumbai",
         "items": [item("Personal Training", 699, 60), item("Group HIIT", 349, 45), item("Strength Program", 549, 60)]},
        {"provider": "user_demoprov_dojo", "provider_name": "Dragon Dojo", "title": "Karate & Self-Defense", "category": "martial",
         "description": "Build discipline, fitness and confidence with certified black-belt instructors.",
         "image_url": "https://images.unsplash.com/photo-1555597408-26bc8e548a46?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
         "location": "Andheri, Mumbai",
         "items": [item("Kids Karate (Beginner)", 399, 60), item("Adult Self-Defense", 499, 60), item("Private 1:1 Session", 999, 60)]},
        {"provider": "user_demoprov_fit", "provider_name": "FitZone Academy", "title": "Cricket Coaching Academy", "category": "cricket",
         "description": "Batting, bowling and fielding coaching by former state-level players.",
         "image_url": "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
         "location": "Wankhede, Mumbai",
         "items": [item("Beginner Batch", 499, 90), item("Advanced Net Session", 799, 90)]},
        {"provider": "user_demoprov_fit", "provider_name": "FitZone Academy", "title": "Football Training Club", "category": "football",
         "description": "Youth football coaching focused on skills, drills and match play.",
         "image_url": "https://images.unsplash.com/photo-1551958219-acbc608c6377?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
         "location": "Powai, Mumbai",
         "items": [item("Junior Coaching (U12)", 449, 90), item("Teen Coaching (U16)", 549, 90)]},
        {"provider": "user_demoprov_dojo", "provider_name": "Dragon Dojo", "title": "Roller Skating Academy", "category": "skating",
         "description": "Fun and safe roller skating coaching for kids and beginners.",
         "image_url": "https://images.unsplash.com/photo-1622640338505-2ad7465bda17?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
         "location": "Andheri, Mumbai",
         "items": [item("Roller Skating Basics", 349, 60), item("Advanced Skating", 549, 75)]},
        {"provider": "user_demoprov_arts", "provider_name": "Creative Minds Studio", "title": "Art & Craft Studio", "category": "art",
         "description": "Drawing, painting and hands-on craft workshops for all ages.",
         "image_url": "https://images.unsplash.com/photo-1605627079912-97c3810a11a4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
         "location": "Koramangala, Bengaluru",
         "items": [item("Kids Craft Workshop", 349, 60), item("Sketching Basics", 399, 90), item("Acrylic Painting", 599, 120)]},
        {"provider": "user_demoprov_arts", "provider_name": "Creative Minds Studio", "title": "Guitar & Keyboard Lessons", "category": "music",
         "description": "Learn guitar, keyboard and music theory with experienced tutors.",
         "image_url": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
         "location": "Indiranagar, Bengaluru",
         "items": [item("Beginner Guitar", 499, 45), item("Keyboard Basics", 499, 45)]},
        {"provider": "user_demoprov_edu", "provider_name": "Bright Scholars", "title": "Kids Tuition Classes", "category": "tuition",
         "description": "After-school tuition for Maths, Science and English (Grades 1-8).",
         "image_url": "https://images.unsplash.com/photo-1583468982228-19f19164aee2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
         "location": "Powai, Mumbai",
         "items": [item("Maths Tuition", 399, 60), item("Science Tuition", 399, 60), item("English Tuition", 349, 60)]},
    ]
    for s in samples:
        await db.services.insert_one({
            "id": f"svc_{uuid.uuid4().hex[:12]}",
            "provider_id": s["provider"],
            "provider_name": s["provider_name"],
            "title": s["title"],
            "description": s["description"],
            "category": s["category"],
            "image_url": s["image_url"],
            "location": s["location"],
            "items": s["items"],
            "available_days": s.get("available_days", [0, 1, 2, 3, 4, 5, 6]),
            "slots": s.get("slots", [
                {"time": "09:00", "mode": "physical", "societies": [x["id"] for x in DEFAULT_SOCIETIES]},
                {"time": "10:00", "mode": "physical", "societies": [x["id"] for x in DEFAULT_SOCIETIES]},
                {"time": "17:00", "mode": "virtual", "societies": []},
                {"time": "18:00", "mode": "virtual", "societies": []},
            ]),
            "status": "approved",
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    logger.info("Seed data created")


async def seed_categories():
    for i, c in enumerate(DEFAULT_CATEGORIES):
        await db.categories.update_one(
            {"id": c["id"]},
            {"$setOnInsert": {**c, "order": i, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )


async def seed_societies():
    for i, s in enumerate(DEFAULT_SOCIETIES):
        await db.societies.update_one(
            {"id": s["id"]},
            {"$setOnInsert": {**s, "order": i, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )


@app.on_event("startup")
async def on_startup():
    await seed_categories()
    await seed_societies()
    await seed_providers()
    await seed_data()
    await seed_more_services()
    await seed_gym_enrichment()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

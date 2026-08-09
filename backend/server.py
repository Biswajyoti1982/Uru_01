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
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

ADMIN_EMAIL = "rrlfnlstrategy@gmail.com"
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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------------- Models ----------------
class ProviderApply(BaseModel):
    business_name: str
    bio: str = ""
    phone: str = ""


class ServiceItem(BaseModel):
    name: str
    price: float
    duration_min: int = 60


class ServiceCreate(BaseModel):
    title: str
    description: str = ""
    category: str
    image_url: str = ""
    location: str = ""
    items: List[ServiceItem] = []


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
    address: str
    notes: str = ""


class CategoryCreate(BaseModel):
    label: str
    icon: str = "sparkles"
    color: str = "#6D28D9"


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
        if email == ADMIN_EMAIL and existing.get("role") != "admin":
            await db.users.update_one({"user_id": user_id}, {"$set": {"role": "admin"}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "admin" if email == ADMIN_EMAIL else "customer"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "role": role,
            "provider_status": None,
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
    }})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


# ---------------- Services (public / customer) ----------------
@api_router.get("/services")
async def list_services(category: Optional[str] = None):
    query = {"status": "approved", "is_visible": True}
    if category:
        query["category"] = category
    services = await db.services.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return services


@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc


@api_router.get("/timeslots")
async def get_timeslots():
    return TIME_SLOTS


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


# ---------------- Bookings (customer) ----------------
@api_router.post("/bookings")
async def create_booking(body: BookingCreate, user=Depends(get_current_user)):
    svc = await db.services.find_one({"id": body.service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    item_map = {i["id"]: i for i in svc.get("items", [])}
    if not body.items:
        raise HTTPException(status_code=400, detail="No items selected")
    line_items = []
    total = 0.0
    for bi in body.items:
        it = item_map.get(bi.item_id)
        if not it:
            raise HTTPException(status_code=400, detail="Invalid item")
        qty = max(1, bi.qty)
        line_items.append({"item_id": it["id"], "name": it["name"], "price": it["price"], "qty": qty, "duration_min": it.get("duration_min", 60)})
        total += it["price"] * qty
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
        "total": round(total, 2),
        "date": body.date,
        "time_slot": body.time_slot,
        "address": body.address,
        "notes": body.notes,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
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


# ---------------- Seed demo data ----------------
async def seed_data():
    if await db.services.count_documents({}) > 0:
        return

    def item(name, price, dur=60):
        return {"id": f"item_{uuid.uuid4().hex[:10]}", "name": name, "price": price, "duration_min": dur}

    providers = [
        {"user_id": "user_demoprov_fit", "email": "fit@uru.app", "name": "Arjun Rao", "business_name": "FitZone Academy", "bio": "Strength training and sports coaching for all ages.", "phone": "+91 90000 10001"},
        {"user_id": "user_demoprov_dojo", "email": "dojo@uru.app", "name": "Kenji Sato", "business_name": "Dragon Dojo", "bio": "Traditional martial arts and skating coaching.", "phone": "+91 90000 10002"},
        {"user_id": "user_demoprov_arts", "email": "arts@uru.app", "name": "Meera Nair", "business_name": "Creative Minds Studio", "bio": "Art, craft and musical instrument classes.", "phone": "+91 90000 10003"},
        {"user_id": "user_demoprov_edu", "email": "edu@uru.app", "name": "Sunita Verma", "business_name": "Bright Scholars", "bio": "After-school tuition for kids across subjects.", "phone": "+91 90000 10004"},
    ]
    for p in providers:
        if not await db.users.find_one({"user_id": p["user_id"]}):
            await db.users.insert_one({**p, "picture": "", "role": "provider", "provider_status": "approved", "created_at": datetime.now(timezone.utc).isoformat()})

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


@app.on_event("startup")
async def on_startup():
    await seed_categories()
    await seed_data()


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

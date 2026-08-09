from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

CATEGORIES = [
    {"id": "gym", "label": "Gym Training"},
    {"id": "sports", "label": "Sports Coaching"},
    {"id": "wellness", "label": "Wellness & Other"},
]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------------- Models ----------------
class ProviderApply(BaseModel):
    business_name: str
    bio: str = ""
    phone: str = ""


class ServiceCreate(BaseModel):
    title: str
    description: str = ""
    category: str
    image_url: str = ""
    level: str = "All Levels"
    location: str = ""


class ClassCreate(BaseModel):
    title: str
    date: str          # YYYY-MM-DD
    start_time: str    # HH:MM
    end_time: str      # HH:MM
    capacity: int = 10


class EnrollCreate(BaseModel):
    class_id: str


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


async def enrolled_count(class_id: str) -> int:
    return await db.enrollments.count_documents({"class_id": class_id})


# ---------------- Auth routes ----------------
@api_router.get("/")
async def root():
    return {"message": "FitConnect API"}


@api_router.get("/categories")
async def get_categories():
    return CATEGORIES


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
    classes = await db.classes.find({"service_id": service_id}, {"_id": 0}).sort("date", 1).to_list(500)
    for cl in classes:
        cl["enrolled_count"] = await enrolled_count(cl["id"])
    svc["classes"] = classes
    return svc


# ---------------- Provider service management ----------------
@api_router.get("/provider/services")
async def provider_services(user=Depends(require_provider)):
    services = await db.services.find({"provider_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for svc in services:
        svc["class_count"] = await db.classes.count_documents({"service_id": svc["id"]})
    return services


@api_router.post("/provider/services")
async def create_service(body: ServiceCreate, user=Depends(require_provider)):
    if body.category not in [c["id"] for c in CATEGORIES]:
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
        "level": body.level,
        "location": body.location,
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
        "image_url": body.image_url, "level": body.level, "location": body.location,
        "status": "pending",
    }})
    return await db.services.find_one({"id": service_id}, {"_id": 0})


@api_router.delete("/provider/services/{service_id}")
async def delete_service(service_id: str, user=Depends(require_provider)):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc or svc["provider_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Service not found")
    await db.services.delete_one({"id": service_id})
    await db.classes.delete_many({"service_id": service_id})
    await db.enrollments.delete_many({"service_id": service_id})
    return {"ok": True}


@api_router.get("/provider/services/{service_id}/classes")
async def provider_service_classes(service_id: str, user=Depends(require_provider)):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc or svc["provider_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Service not found")
    classes = await db.classes.find({"service_id": service_id}, {"_id": 0}).sort("date", 1).to_list(500)
    for cl in classes:
        cl["enrolled_count"] = await enrolled_count(cl["id"])
    return classes


@api_router.post("/provider/services/{service_id}/classes")
async def create_class(service_id: str, body: ClassCreate, user=Depends(require_provider)):
    svc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not svc or svc["provider_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Service not found")
    class_id = f"cls_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": class_id,
        "service_id": service_id,
        "provider_id": user["user_id"],
        "title": body.title,
        "date": body.date,
        "start_time": body.start_time,
        "end_time": body.end_time,
        "capacity": body.capacity,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.classes.insert_one(doc)
    return await db.classes.find_one({"id": class_id}, {"_id": 0})


@api_router.delete("/provider/classes/{class_id}")
async def delete_class(class_id: str, user=Depends(require_provider)):
    cl = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cl or cl["provider_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Class not found")
    await db.classes.delete_one({"id": class_id})
    await db.enrollments.delete_many({"class_id": class_id})
    return {"ok": True}


@api_router.get("/provider/enrollments")
async def provider_enrollments(user=Depends(require_provider)):
    enrollments = await db.enrollments.find({"provider_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return enrollments


# ---------------- Enrollments (customer) ----------------
@api_router.post("/enrollments")
async def enroll(body: EnrollCreate, user=Depends(get_current_user)):
    cl = await db.classes.find_one({"id": body.class_id}, {"_id": 0})
    if not cl:
        raise HTTPException(status_code=404, detail="Class not found")
    existing = await db.enrollments.find_one({"class_id": body.class_id, "customer_id": user["user_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
    count = await enrolled_count(body.class_id)
    if count >= cl["capacity"]:
        raise HTTPException(status_code=400, detail="Class is full")
    svc = await db.services.find_one({"id": cl["service_id"]}, {"_id": 0})
    enrollment_id = f"enr_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": enrollment_id,
        "class_id": body.class_id,
        "service_id": cl["service_id"],
        "service_title": svc["title"] if svc else "",
        "class_title": cl["title"],
        "class_date": cl["date"],
        "class_start": cl["start_time"],
        "class_end": cl["end_time"],
        "provider_id": cl["provider_id"],
        "customer_id": user["user_id"],
        "customer_name": user.get("name", ""),
        "customer_email": user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.enrollments.insert_one(doc)
    return await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})


@api_router.get("/enrollments/me")
async def my_enrollments(user=Depends(get_current_user)):
    enrollments = await db.enrollments.find({"customer_id": user["user_id"]}, {"_id": 0}).sort("class_date", 1).to_list(1000)
    return enrollments


@api_router.delete("/enrollments/{enrollment_id}")
async def unenroll(enrollment_id: str, user=Depends(get_current_user)):
    enr = await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})
    if not enr or enr["customer_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    await db.enrollments.delete_one({"id": enrollment_id})
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
        "classes": await db.classes.count_documents({}),
        "enrollments": await db.enrollments.count_documents({}),
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
        svc["class_count"] = await db.classes.count_documents({"service_id": svc["id"]})
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


# ---------------- Seed demo data ----------------
async def seed_data():
    if await db.services.count_documents({}) > 0:
        return
    provider_id = "user_demoprovider01"
    existing = await db.users.find_one({"user_id": provider_id})
    if not existing:
        await db.users.insert_one({
            "user_id": provider_id,
            "email": "demo.coach@fitconnect.app",
            "name": "Alex Rivera",
            "picture": "",
            "role": "provider",
            "provider_status": "approved",
            "business_name": "Iron Forge Athletics",
            "bio": "Certified strength & conditioning coach with 10+ years of experience.",
            "phone": "+1 555 0100",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    def future(days):
        return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")

    samples = [
        {
            "title": "Strength & Power Bootcamp",
            "description": "High-intensity barbell and conditioning circuit built to add raw strength and explosive power.",
            "category": "gym",
            "image_url": "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?crop=entropy&cs=srgb&fm=jpg&q=85",
            "level": "Intermediate",
            "location": "Iron Forge Studio A",
            "classes": [
                {"title": "Lower Body Power", "date": future(2), "start_time": "07:00", "end_time": "08:00", "capacity": 12},
                {"title": "Upper Body Strength", "date": future(4), "start_time": "18:00", "end_time": "19:00", "capacity": 12},
            ],
        },
        {
            "title": "Elite Tennis Coaching",
            "description": "One-on-group technical coaching covering footwork, serve mechanics and match strategy.",
            "category": "sports",
            "image_url": "https://images.unsplash.com/photo-1545151414-8a948e1ea54f?crop=entropy&cs=srgb&fm=jpg&q=85",
            "level": "All Levels",
            "location": "Center Court Club",
            "classes": [
                {"title": "Serve & Volley Clinic", "date": future(3), "start_time": "09:00", "end_time": "10:30", "capacity": 8},
            ],
        },
        {
            "title": "Vinyasa Flow Yoga",
            "description": "Breath-led flowing yoga to build mobility, balance and calm focus.",
            "category": "wellness",
            "image_url": "https://images.unsplash.com/photo-1651077837628-52b3247550ae?crop=entropy&cs=srgb&fm=jpg&q=85",
            "level": "Beginner",
            "location": "Zen Wellness Loft",
            "classes": [
                {"title": "Morning Flow", "date": future(1), "start_time": "06:30", "end_time": "07:30", "capacity": 20},
                {"title": "Evening Unwind", "date": future(5), "start_time": "19:00", "end_time": "20:00", "capacity": 20},
            ],
        },
    ]

    for s in samples:
        service_id = f"svc_{uuid.uuid4().hex[:12]}"
        classes = s.pop("classes")
        await db.services.insert_one({
            "id": service_id,
            "provider_id": provider_id,
            "provider_name": "Iron Forge Athletics",
            "status": "approved",
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **s,
        })
        for cl in classes:
            await db.classes.insert_one({
                "id": f"cls_{uuid.uuid4().hex[:12]}",
                "service_id": service_id,
                "provider_id": provider_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                **cl,
            })
    logger.info("Seed data created")


@app.on_event("startup")
async def on_startup():
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

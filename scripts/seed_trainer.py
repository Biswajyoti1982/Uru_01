import asyncio, os, uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

EMAIL = "biswajyoti.ghy@gmail.com"
UID = "user_trainer_biswa"
TOKEN = "test_session_biswa_001"
SVC_ID = "svc_biswa_gym"
SOCIETIES = ["soc_green_valley", "soc_lake_view", "soc_sunrise", "soc_palm_grove"]


async def main():
    c = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = c[os.environ['DB_NAME']]
    now = datetime.now(timezone.utc).isoformat()

    profile = {
        "name": "Biswajyoti Ghosh",
        "business_name": "BG Strength & Performance",
        "bio": "Certified personal trainer specialising in strength, fat-loss and functional fitness. I build personalised, sustainable programs for every body type and goal.",
        "phone": "+91 90000 20001",
        "experience_years": 9,
        "age": 31,
        "gender": "male",
        "certifications": ["ACSM Certified Personal Trainer", "Precision Nutrition L1", "First-Aid & CPR Certified"],
        "specialties": ["Strength Training", "Fat Loss", "Functional Fitness"],
        "languages": ["English", "Hindi", "Assamese", "Bengali"],
        "rating": 4.8,
        "is_verified": True,
        "avatar_url": "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?crop=entropy&cs=srgb&fm=jpg&q=85&w=400",
        "role": "provider",
        "provider_status": "approved",
        "picture": "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?crop=entropy&cs=srgb&fm=jpg&q=85&w=400",
    }
    await db.users.update_one(
        {"user_id": UID},
        {"$set": profile, "$setOnInsert": {"user_id": UID, "email": EMAIL, "created_at": now}},
        upsert=True,
    )
    # Also promote by email in case a customer account already exists under this email
    await db.users.update_one({"email": EMAIL, "user_id": {"$ne": UID}}, {"$set": {"role": "provider", "provider_status": "approved", **profile}})

    if not await db.services.find_one({"id": SVC_ID}):
        items = [
            {"id": f"item_{uuid.uuid4().hex[:10]}", "name": "1-on-1 Personal Training", "price": 1499, "duration_min": 60},
            {"id": f"item_{uuid.uuid4().hex[:10]}", "name": "Small Group (max 6)", "price": 699, "duration_min": 60},
            {"id": f"item_{uuid.uuid4().hex[:10]}", "name": "Online Coaching", "price": 499, "duration_min": 45},
        ]
        slots = [
            {"time": "06:00", "mode": "physical", "societies": SOCIETIES, "batch_size": 6},
            {"time": "07:00", "mode": "physical", "societies": SOCIETIES, "batch_size": 6},
            {"time": "18:00", "mode": "physical", "societies": SOCIETIES, "batch_size": 8},
            {"time": "20:00", "mode": "virtual", "societies": [], "batch_size": 15},
        ]
        await db.services.insert_one({
            "id": SVC_ID,
            "provider_id": UID,
            "provider_name": profile["business_name"],
            "title": "Personal Fitness Coaching",
            "description": "Goal-based strength and conditioning with weekly progress reviews. Choose 1-on-1, small group or online coaching.",
            "category": "gym",
            "image_url": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
            "location": "Powai, Mumbai",
            "items": items,
            "available_days": [1, 2, 3, 4, 5, 6],
            "slots": slots,
            "gender": "all",
            "age_group": "Adults",
            "experience_level": "All levels",
            "eligibility": "Open to all fitness levels. Please consult a physician before starting an intensive program.",
            "status": "approved",
            "is_visible": True,
            "created_at": now,
        })

    exp = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    await db.user_sessions.update_one(
        {"session_token": TOKEN},
        {"$set": {"session_token": TOKEN, "user_id": UID, "expires_at": exp, "created_at": now}},
        upsert=True,
    )
    u = await db.users.find_one({"email": EMAIL}, {"_id": 0, "user_id": 1, "email": 1, "role": 1, "provider_status": 1, "business_name": 1})
    print("USER:", u)
    print("SESSION TOKEN:", TOKEN)

asyncio.run(main())

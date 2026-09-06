import asyncio, os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
EMAIL = "biswajyoti.ghy@gmail.com"
SYNTH = "user_trainer_biswa"
TOKEN = "test_session_biswa_001"
SVC_ID = "svc_biswa_gym"


async def main():
    c = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = c[os.environ['DB_NAME']]
    users = await db.users.find({"email": EMAIL}, {"_id": 0}).to_list(10)
    ids = [u["user_id"] for u in users]
    print("accounts for email:", ids)

    # canonical = the real Google account (not the synthetic one) if it exists
    real = next((u for u in users if u["user_id"] != SYNTH), None)
    canonical = real["user_id"] if real else SYNTH
    biz = "BG Strength & Performance"

    # move service + session to canonical
    await db.services.update_one({"id": SVC_ID}, {"$set": {"provider_id": canonical, "provider_name": biz}})
    await db.user_sessions.update_one({"session_token": TOKEN}, {"$set": {"user_id": canonical}})
    # move any bookings that referenced synthetic provider
    await db.bookings.update_many({"provider_id": SYNTH}, {"$set": {"provider_id": canonical, "provider_name": biz}})

    # delete duplicate synthetic account if a real one exists
    if canonical != SYNTH:
        await db.users.delete_one({"user_id": SYNTH})

    remaining = await db.users.find({"email": EMAIL}, {"_id": 0, "user_id": 1, "role": 1, "provider_status": 1, "business_name": 1}).to_list(10)
    svc = await db.services.find_one({"id": SVC_ID}, {"_id": 0, "provider_id": 1, "title": 1})
    print("canonical:", canonical)
    print("remaining accounts:", remaining)
    print("service owner:", svc)

asyncio.run(main())

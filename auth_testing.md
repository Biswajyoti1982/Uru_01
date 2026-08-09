# Auth-Gated App Testing Playbook (Emergent Google Auth)

## Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  role: 'customer',
  provider_status: null,
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```
curl -X GET "$URL/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "$URL/api/services" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing (set cookie)
```
await page.context.add_cookies([{
  "name": "session_token", "value": "YOUR_SESSION_TOKEN",
  "domain": "your-app.com", "path": "/",
  "httpOnly": True, "secure": True, "sameSite": "None"
}])
await page.goto("https://your-app.com/app")
```

## Roles
- admin: rrlfnlstrategy@gmail.com (auto-assigned on login)
- provider: set role='provider', provider_status='approved'
- customer: default

## Checklist
- users have user_id (custom UUID), queries use {"_id":0}
- session user_id matches user.user_id
- /api/auth/me returns user (not 401)
- callback detection uses useLocation().hash

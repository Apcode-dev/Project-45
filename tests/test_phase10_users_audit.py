import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://localhost:5001/api"

def get_auth_token():
    url = f"{BASE_URL}/auth/login"
    data = json.dumps({"email": "admin@mis.local", "password": "Admin@12345"}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        return res["data"]["token"]

def test_users_and_audit():
    token = get_auth_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    print("[TEST] 1. Testing GET /api/users (Admin-only)...")
    req = urllib.request.Request(f"{BASE_URL}/users", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        users = res["data"]
        print(f"[OK] Fetched {len(users)} registered system accounts.")

    print("[TEST] 2. Testing POST /api/users (Create New Medical Staff)...")
    ts = int(time.time())
    new_user = {
        "name": f"Dr. Anjali Mehta {ts}",
        "email": f"anjali_{ts}@mis.local",
        "password": "StaffPassword@123",
        "role": "PHARMACIST",
        "phone": "+91 9911223344",
        "status": "ACTIVE"
    }
    req = urllib.request.Request(f"{BASE_URL}/users", data=json.dumps(new_user).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        created_user = res["data"]
        print(f"[OK] Created User: {created_user['name']} (Role: {created_user['role']})")
        user_id = created_user["_id"]

    print("[TEST] 3. Testing PUT /api/users/:id (Update User Role & Status)...")
    update_payload = {
        "role": "INVENTORY_MANAGER",
        "phone": "+91 9911229988"
    }
    req = urllib.request.Request(f"{BASE_URL}/users/{user_id}", data=json.dumps(update_payload).encode(), headers=headers, method="PUT")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        assert res["data"]["role"] == "INVENTORY_MANAGER"
        print(f"[OK] Updated user role: {res['data']['role']}")

    print("[TEST] 4. Testing GET /api/audit (Admin Audit Logs)...")
    req = urllib.request.Request(f"{BASE_URL}/audit?limit=10", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        print(f"[OK] Audit logs accessible. Count returned: {len(res['data'])}")

    print("\n=======================================================")
    print("ALL PHASE 10 BACKEND TESTS PASSED SUCCESSFULLY (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    test_users_and_audit()

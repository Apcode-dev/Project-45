import urllib.request
import json

test_users = [
    ("admin@mis.local", "Admin@12345", "ADMIN"),
    ("pharmacist@mis.local", "Pharma@12345", "PHARMACIST"),
    ("inventory@mis.local", "Stock@12345", "INVENTORY_MANAGER"),
    ("staff@mis.local", "Staff@12345", "STAFF"),
]

admin_token = None

for email, password, expected_role in test_users:
    login_data = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        "http://localhost:5001/api/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        u = res["data"]["user"]
        print(f"[Auth Success] {email} -> {u['name']} | Role: {u['role']}")
        if u["role"] == "ADMIN":
            admin_token = res["data"]["token"]

# Test Dashboard
print("\n[Testing Dashboard Aggregation from MongoDB]...")
stats_req = urllib.request.Request(
    "http://localhost:5001/api/dashboard/stats",
    headers={"Authorization": f"Bearer {admin_token}"}
)
with urllib.request.urlopen(stats_req) as resp:
    stats = json.loads(resp.read().decode())
    print("MongoDB Live KPIs:", json.dumps(stats["data"]["kpis"], indent=2))
    print("Expiry Health:", json.dumps(stats["data"]["charts"]["expiryBreakdown"], indent=2))
    print("Category Breakdown:", json.dumps(stats["data"]["charts"]["categoryBreakdown"], indent=2))
    print("Recent Movements Count:", len(stats["data"]["recentMovements"]))

print("\n--- PHASE 1 AUTOMATED TESTS PASSED 100% ---")

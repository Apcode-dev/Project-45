import urllib.request
import json

# 1. Login as Admin
login_data = json.dumps({"email": "admin@mis.local", "password": "Admin@12345"}).encode("utf-8")
req = urllib.request.Request(
    "http://localhost:5001/api/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    token = res["data"]["token"]

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 2. Test Categories
cat_req = urllib.request.Request("http://localhost:5001/api/categories?type=THERAPEUTIC", headers=headers)
with urllib.request.urlopen(cat_req) as resp:
    cats = json.loads(resp.read().decode())
    print(f"[Categories API] Fetched {len(cats['data'])} Therapeutic Categories")

# 3. Test Dosage Forms
df_req = urllib.request.Request("http://localhost:5001/api/categories/dosage-forms/all", headers=headers)
with urllib.request.urlopen(df_req) as resp:
    dfs = json.loads(resp.read().decode())
    print(f"[Dosage Forms API] Fetched {len(dfs['data'])} Dosage Forms")

# 4. Test Manufacturers
mfg_req = urllib.request.Request("http://localhost:5001/api/manufacturers", headers=headers)
with urllib.request.urlopen(mfg_req) as resp:
    mfgs = json.loads(resp.read().decode())
    print(f"[Manufacturers API] Fetched {len(mfgs['data'])} Manufacturers")

# 5. Test Medicines Listing
meds_req = urllib.request.Request("http://localhost:5001/api/medicines?limit=10", headers=headers)
with urllib.request.urlopen(meds_req) as resp:
    meds = json.loads(resp.read().decode())
    print(f"[Medicines API] Fetched {len(meds['data'])} medicines (Total in DB: {meds['pagination']['total']})")
    sample = meds['data'][0]
    print(f"  Sample Medicine: {sample['name']} | Stock: {sample['totalStock']} | Primary Code: {sample['primaryCode']}")

# 6. Test Create Medicine
import time
new_med = {
    "name": f"Ibuprofen {int(time.time()) % 10000}",
    "brandName": "Brufen",
    "genericName": "Ibuprofen",
    "strength": "400 mg",
    "composition": "Ibuprofen IP 400mg",
    "prescriptionRequired": False,
    "minStockLevel": 30,
    "maxStockLevel": 500,
    "unit": "Strip (10 tabs)",
    "initialCode": f"890999{int(time.time() * 1000)}",
    "initialCodeType": "BARCODE"
}
create_req = urllib.request.Request(
    "http://localhost:5001/api/medicines",
    data=json.dumps(new_med).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(create_req) as resp:
    created = json.loads(resp.read().decode())
    med_id = created["data"]["_id"]
    print(f"[Create Medicine API] Successfully created: {created['data']['name']} (ID: {med_id})")

# 7. Test Get Medicine By ID
get_req = urllib.request.Request(f"http://localhost:5001/api/medicines/{med_id}", headers=headers)
with urllib.request.urlopen(get_req) as resp:
    fetched = json.loads(resp.read().decode())
    print(f"[Get Medicine By ID] Verified {fetched['data']['name']} with {len(fetched['data']['codes'])} codes registered")

print("\n--- PHASE 2 BACKEND APIS VERIFIED 100% ---")

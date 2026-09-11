import urllib.request
import json

# 1. Login
login_data = json.dumps({"email": "admin@mis.local", "password": "Admin@12345"}).encode("utf-8")
req = urllib.request.Request(
    "http://localhost:5001/api/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())["data"]["token"]

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 2. Test Lookup - Found Medicine (Dolo 650)
lookup_req = urllib.request.Request("http://localhost:5001/api/scanner/lookup/8901234567890", headers=headers)
with urllib.request.urlopen(lookup_req) as resp:
    res = json.loads(resp.read().decode())
    data = res["data"]
    assert data["found"] == True
    print(f"[Scanner Lookup - Found] Scanned: 8901234567890 -> Found: {data['medicine']['name']} ({data['medicine']['genericName']})")
    print(f"  Total Stock: {data['medicine']['totalStock']} units | Batches Available: {len(data['batches'])}")

# 3. Test Lookup - Not Found Medicine
nf_req = urllib.request.Request("http://localhost:5001/api/scanner/lookup/UNKNOWN888888", headers=headers)
with urllib.request.urlopen(nf_req) as resp:
    res = json.loads(resp.read().decode())
    assert res["data"]["found"] == False
    print(f"[Scanner Lookup - Not Found] Scanned: UNKNOWN888888 -> Correctly reported not registered [OK]")

# 4. Test Quick Inward via Scanner
med_id = data["medicine"]["_id"]
inward_data = {
    "medicineId": med_id,
    "batchNumber": "DL-24B",
    "manufacturingDate": "2024-05-15",
    "expiryDate": "2027-11-20",
    "quantity": 50,
    "purchasePrice": 18.50,
    "mrp": 32.00
}
inward_req = urllib.request.Request(
    "http://localhost:5001/api/scanner/quick-inward",
    data=json.dumps(inward_data).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(inward_req) as resp:
    inward_res = json.loads(resp.read().decode())
    print(f"[Quick Inward API] {inward_res['message']} (New Stock: {inward_res['totalMedicineStock']})")

print("\n--- PHASE 3 SCANNER APIS VERIFIED 100% ---")

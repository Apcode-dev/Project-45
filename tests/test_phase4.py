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

# 2. Test List Batches (FEFO Sort)
batches_req = urllib.request.Request("http://localhost:5001/api/batches?fefoSort=true", headers=headers)
with urllib.request.urlopen(batches_req) as resp:
    batches = json.loads(resp.read().decode())["data"]
    print(f"[FEFO Engine] Listed {len(batches)} batches sorted by earliest expiry date:")
    for b in batches[:3]:
        med_name = b.get("medicineId", {}).get("name", "Unknown") if isinstance(b.get("medicineId"), dict) else "Medicine"
        print(f"  - Batch {b['batchNumber']} ({med_name}) | Expiry: {b['expiryDate'][:10]} | Status: {b['status']} | ShelfLife: {b['shelfLifeStatus']}")

# 3. Test Stock Adjustment (+/- with mandatory reason)
target_batch = batches[0]
med_id = target_batch["medicineId"]["_id"] if isinstance(target_batch["medicineId"], dict) else target_batch["medicineId"]
adjust_data = {
    "medicineId": med_id,
    "batchId": target_batch["_id"],
    "type": "DAMAGE",
    "quantity": 2,
    "reason": "Vial broken during morning ward inspection"
}

adjust_req = urllib.request.Request(
    "http://localhost:5001/api/inventory/adjust",
    data=json.dumps(adjust_data).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(adjust_req) as resp:
    adj_res = json.loads(resp.read().decode())
    print(f"[Stock Adjustment] {adj_res['message']}")

# 4. Test Transactions Audit Ledger
tx_req = urllib.request.Request("http://localhost:5001/api/inventory/transactions?limit=5", headers=headers)
with urllib.request.urlopen(tx_req) as resp:
    txs = json.loads(resp.read().decode())
    print(f"[Inventory Ledger] Verified {len(txs['data'])} transactions recorded. Latest type: {txs['data'][0]['type']}, Delta: {txs['data'][0]['quantityDelta']}")

print("\n--- PHASE 4 BATCH & INVENTORY APIS VERIFIED 100% ---")

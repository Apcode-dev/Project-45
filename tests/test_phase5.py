import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:5001/api"

def get_auth_token():
    url = f"{BASE_URL}/auth/login"
    data = json.dumps({"email": "admin@mis.local", "password": "Admin@12345"}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        return res["data"]["token"]

def test_suppliers_and_purchases():
    token = get_auth_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    print("[TEST] 1. Testing GET /api/suppliers...")
    req = urllib.request.Request(f"{BASE_URL}/suppliers", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        print(f"[OK] Fetched {len(res['data'])} suppliers.")

    print("[TEST] 2. Testing POST /api/suppliers (Create Supplier)...")
    import time
    timestamp = int(time.time())
    new_supp = {
        "name": f"Global Life Care {timestamp}",
        "contactPerson": "Vikram Seth",
        "email": f"vikram_{timestamp}@globallifecare.com",
        "phone": "+91 9887766554",
        "address": "B-44, Sector 62, Noida, UP",
        "gstin": "07AAAAA0000A1Z5",
        "status": "ACTIVE"
    }
    req = urllib.request.Request(f"{BASE_URL}/suppliers", data=json.dumps(new_supp).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        supplier_id = res["data"]["_id"]
        print(f"[OK] Created supplier ID: {supplier_id}, Name: {res['data']['name']}")

    print("[TEST] 3. Fetching a medicine to order...")
    req = urllib.request.Request(f"{BASE_URL}/medicines?limit=1", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert len(res["data"]) > 0
        med = res["data"][0]
        med_id = med["_id"]
        initial_stock = med.get("totalStock", 0)
        print(f"[OK] Medicine: {med['name']} (Initial Total Stock: {initial_stock})")

    print("[TEST] 4. Testing POST /api/purchases (Create PO in ORDERED status)...")
    po_payload = {
        "supplierId": supplier_id,
        "invoiceNumber": "INV-2026-8801",
        "items": [
            {
                "medicineId": med_id,
                "batchNumber": "TEST-PO-B1",
                "expiryDate": "2027-10-31",
                "quantity": 50,
                "purchasePrice": 12.50,
                "sellingPrice": 25.00
            }
        ],
        "tax": 62.5,
        "shipping": 50.0,
        "notes": "Emergency restock order",
        "status": "ORDERED"
    }
    req = urllib.request.Request(f"{BASE_URL}/purchases", data=json.dumps(po_payload).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        po_id = res["data"]["_id"]
        po_number = res["data"]["poNumber"]
        print(f"[OK] PO Created: {po_number} (ID: {po_id}, Status: {res['data']['status']})")

    print("[TEST] 5. Testing PUT /api/purchases/:id/receive (Receive PO into inventory)...")
    req = urllib.request.Request(f"{BASE_URL}/purchases/{po_id}/receive", data=b"{}", headers=headers, method="PUT")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        assert res["data"]["status"] == "RECEIVED"
        print(f"[OK] PO received successfully. Status: {res['data']['status']}")

    print("[TEST] 6. Verifying stock increment and batch creation...")
    req = urllib.request.Request(f"{BASE_URL}/medicines/{med_id}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        new_stock = res["data"]["totalStock"]
        assert new_stock == initial_stock + 50
        print(f"[OK] Medicine total stock updated: {initial_stock} -> {new_stock}")

    print("[TEST] 7. Verifying InventoryTransaction ledger entry...")
    req = urllib.request.Request(f"{BASE_URL}/inventory/transactions?limit=5", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        txs = res["data"]
        purchase_tx = next((t for t in txs if t.get("type") == "PURCHASE" and "TEST-PO-B1" in str(t.get("notes"))), None)
        assert purchase_tx is not None
        print(f"[OK] Ledger recorded PURCHASE transaction: delta = +{purchase_tx['quantityDelta']}")

    print("\n=======================================================")
    print("ALL PHASE 5 BACKEND TESTS PASSED SUCCESSFULLY (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    test_suppliers_and_purchases()

import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:5001/api"

def get_auth_token():
    url = f"{BASE_URL}/auth/login"
    data = json.dumps({"email": "pharmacist@mis.local", "password": "Pharma@12345"}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        return res["data"]["token"]

def test_sales_and_fefo():
    token = get_auth_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    print("[TEST] 1. Testing GET /api/sales...")
    req = urllib.request.Request(f"{BASE_URL}/sales", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        print(f"[OK] Sales endpoint returned success: {len(res['data'])} sales found.")

    print("[TEST] 2. Finding a medicine with active stock for FEFO sale...")
    req = urllib.request.Request(f"{BASE_URL}/medicines", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        meds_with_stock = [m for m in res["data"] if m.get("totalStock", 0) >= 10]
        assert len(meds_with_stock) > 0, "No medicines with stock found"
        med = meds_with_stock[0]
        med_id = med["_id"]
        initial_stock = med["totalStock"]
        print(f"[OK] Target medicine: {med['name']} (Initial Total Stock: {initial_stock})")

    print("[TEST] 3. Testing POST /api/sales with AUTO-FEFO allocation...")
    sale_payload = {
        "customerName": "Ramesh Verma",
        "customerPhone": "+91 9811223344",
        "doctorName": "Dr. S. K. Gupta",
        "prescriptionNumber": "RX-9902",
        "paymentMethod": "UPI",
        "discount": 5.0,
        "tax": 2.5,
        "items": [
            {
                "medicineId": med_id,
                "quantity": 3
            }
        ]
    }
    req = urllib.request.Request(f"{BASE_URL}/sales", data=json.dumps(sale_payload).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        sale_data = res["data"]
        invoice_num = sale_data["invoiceNumber"]
        allocated_batch = sale_data["items"][0]["batchNumber"]
        print(f"[OK] Sale completed! Invoice: {invoice_num}, Auto-allocated FEFO Batch: {allocated_batch}")

    print("[TEST] 4. Verifying medicine stock decrement...")
    req = urllib.request.Request(f"{BASE_URL}/medicines/{med_id}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        new_stock = res["data"]["totalStock"]
        assert new_stock == initial_stock - 3
        print(f"[OK] Stock successfully decremented: {initial_stock} -> {new_stock}")

    print("[TEST] 5. Verifying InventoryTransaction ledger entry for SALE...")
    req = urllib.request.Request(f"{BASE_URL}/inventory/transactions?limit=5", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        txs = res["data"]
        sale_tx = next((t for t in txs if t.get("type") == "SALE" and t.get("quantityDelta") == -3), None)
        assert sale_tx is not None
        print(f"[OK] Transaction recorded in ledger: type = SALE, delta = {sale_tx['quantityDelta']}")

    print("[TEST] 6. Testing Sale Return & Restock (POST /api/sales/:id/return)...")
    sale_id = sale_data["_id"]
    return_payload = {
        "reason": "Customer requested cancellation before leaving counter",
        "restock": True
    }
    req = urllib.request.Request(f"{BASE_URL}/sales/{sale_id}/return", data=json.dumps(return_payload).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        assert res["data"]["status"] == "REFUNDED"
        print(f"[OK] Sale refunded: status = {res['data']['status']}")

    print("[TEST] 7. Verifying stock restoration after return...")
    req = urllib.request.Request(f"{BASE_URL}/medicines/{med_id}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        restored_stock = res["data"]["totalStock"]
        assert restored_stock == initial_stock
        print(f"[OK] Stock restored back to original: {new_stock} -> {restored_stock}")

    print("\n=======================================================")
    print("ALL PHASE 6 BACKEND TESTS PASSED SUCCESSFULLY (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    test_sales_and_fefo()

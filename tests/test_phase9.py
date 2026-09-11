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

def test_branches_and_transfers():
    token = get_auth_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    print("[TEST] 1. Testing GET /api/branches...")
    req = urllib.request.Request(f"{BASE_URL}/branches", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        branches = res["data"]
        print(f"[OK] Fetched {len(branches)} branches. Primary: {branches[0]['name']}")
        main_branch_id = branches[0]["_id"]

    print("[TEST] 2. Testing POST /api/branches (Create Satellite Pharmacy)...")
    ts = int(time.time())
    new_branch = {
        "name": f"ICU Satellite Ward {ts}",
        "code": f"ICU-{ts % 10000}",
        "address": "3rd Floor, Intensive Care Wing",
        "phone": "+91 9988776655",
        "isMain": False
    }
    req = urllib.request.Request(f"{BASE_URL}/branches", data=json.dumps(new_branch).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        dest_branch_id = res["data"]["_id"]
        print(f"[OK] Created satellite branch: {res['data']['name']} (Code: {res['data']['code']})")

    print("[TEST] 3. Finding an active batch for transfer...")
    req = urllib.request.Request(f"{BASE_URL}/batches?quantity_gt=10", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        batches = [b for b in res["data"] if b["quantity"] >= 10]
        assert len(batches) > 0, "No batch with stock >= 10 found"
        source_batch = batches[0]
        batch_id = source_batch["_id"]
        init_batch_qty = source_batch["quantity"]
        print(f"[OK] Source batch: {source_batch['batchNumber']} (Current Qty: {init_batch_qty})")

    print("[TEST] 4. Testing POST /api/branches/transfers (Dispatch Transfer)...")
    transfer_payload = {
        "fromBranchId": main_branch_id,
        "toBranchId": dest_branch_id,
        "notes": "Emergency requisition for ICU ventilator ward",
        "items": [
            {
                "batchId": batch_id,
                "quantity": 5
            }
        ]
    }
    req = urllib.request.Request(f"{BASE_URL}/branches/transfers", data=json.dumps(transfer_payload).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        transfer_data = res["data"]
        trf_id = transfer_data["_id"]
        trf_no = transfer_data["transferNumber"]
        print(f"[OK] Transfer Dispatched! Number: {trf_no}, Status: {transfer_data['status']}")

    print("[TEST] 5. Verifying source batch deduction...")
    req = urllib.request.Request(f"{BASE_URL}/batches/{batch_id}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["data"]["quantity"] == init_batch_qty - 5
        print(f"[OK] Source batch deducted: {init_batch_qty} -> {res['data']['quantity']}")

    print(f"[TEST] 6. Testing PUT /api/branches/transfers/{trf_id}/receive (Receive at destination)...")
    req = urllib.request.Request(f"{BASE_URL}/branches/transfers/{trf_id}/receive", data=b"{}", headers=headers, method="PUT")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        assert res["data"]["status"] == "RECEIVED"
        print(f"[OK] Transfer successfully received at destination: status = {res['data']['status']}")

    print("\n=======================================================")
    print("ALL PHASE 9 BACKEND TESTS PASSED SUCCESSFULLY (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    test_branches_and_transfers()

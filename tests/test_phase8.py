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

def test_reports_and_analytics():
    token = get_auth_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    print("[TEST] 1. Testing GET /api/reports/valuation...")
    req = urllib.request.Request(f"{BASE_URL}/reports/valuation", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        summary = res["data"]["summary"]
        print(f"[OK] Total Stock Units: {summary['totalUnits']}, Purchase Value: Rs.{summary['totalPurchaseValue']}, Retail Value: Rs.{summary['totalRetailValue']}, Potential Margin: {summary['profitMargin']}%")

    print("[TEST] 2. Testing GET /api/reports/sales-summary...")
    req = urllib.request.Request(f"{BASE_URL}/reports/sales-summary?days=30", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        s_summary = res["data"]["summary"]
        print(f"[OK] Total Sales Revenue: Rs.{s_summary['totalRevenue']}, Invoices Count: {s_summary['totalInvoices']}")

    print("[TEST] 3. Testing GET /api/reports/expiry-timeline...")
    req = urllib.request.Request(f"{BASE_URL}/reports/expiry-timeline", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        data = res["data"]
        print(f"[OK] Expiry Buckets - <30d: {data['within30Days']['count']}, <60d: {data['within60Days']['count']}, Expired: {data['expired']['count']}")

    print("[TEST] 4. Testing GET /api/reports/slow-moving...")
    req = urllib.request.Request(f"{BASE_URL}/reports/slow-moving", headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] is True
        print(f"[OK] Slow moving medicines count: {res['count']}")

    print("[TEST] 5. Testing GET /api/reports/export/csv?type=valuation...")
    csv_req = urllib.request.Request(f"{BASE_URL}/reports/export/csv?type=valuation", headers=headers)
    with urllib.request.urlopen(csv_req) as resp:
        csv_text = resp.read().decode()
        assert "Medicine Name" in csv_text
        assert "Total MRP Value" in csv_text
        print("[OK] CSV Export generated successfully with correct headers.")

    print("\n=======================================================")
    print("ALL PHASE 8 BACKEND TESTS PASSED SUCCESSFULLY (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    test_reports_and_analytics()

import os
import json
import time
import zipfile
import urllib.request
from datetime import datetime

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backups")

def run_backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    current_backup_folder = os.path.join(BACKUP_DIR, f"backup_{timestamp_str}")
    os.makedirs(current_backup_folder, exist_ok=True)

    print(f"============================================================")
    print(f" [MIS] Medical Inventory System - Disaster Recovery Backup")
    print(f" Timestamp: {timestamp_str}")
    print(f" Destination: {current_backup_folder}")
    print(f"============================================================")

    # List of models/endpoints to snapshot
    login_data = json.dumps({"email": "admin@mis.local", "password": "Admin@12345"}).encode()
    login_req = urllib.request.Request("http://localhost:5001/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(login_req) as resp:
            token = json.loads(resp.read().decode())["data"]["token"]
    except Exception as e:
        print(f"[ERROR] Failed to authenticate for backup: {e}")
        return

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    endpoints = {
        "medicines.json": "http://localhost:5001/api/medicines?limit=1000",
        "batches.json": "http://localhost:5001/api/batches",
        "sales.json": "http://localhost:5001/api/sales?limit=1000",
        "purchases.json": "http://localhost:5001/api/purchases",
        "suppliers.json": "http://localhost:5001/api/suppliers",
        "branches.json": "http://localhost:5001/api/branches",
        "alerts.json": "http://localhost:5001/api/alerts",
        "inventory_transactions.json": "http://localhost:5001/api/inventory/transactions?limit=1000",
        "categories.json": "http://localhost:5001/api/categories",
        "manufacturers.json": "http://localhost:5001/api/manufacturers",
        "users.json": "http://localhost:5001/api/users"
    }

    manifest = {
        "timestamp": datetime.now().isoformat(),
        "database": "medical_inventory",
        "engine": "MongoDB 7.0 / Node.js Express",
        "collections": {}
    }

    total_records = 0
    for filename, url in endpoints.items():
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                items = data.get("data", [])
                total_records += len(items)
                manifest["collections"][filename] = len(items)
                
                filepath = os.path.join(current_backup_folder, filename)
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(items, f, indent=2, default=str)
                print(f"  [OK] Saved {filename:<28} ({len(items):>4} records)")
        except Exception as e:
            print(f"  [WARN] Could not dump {filename}: {e}")

    # Write manifest
    with open(os.path.join(current_backup_folder, "backup_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Create ZIP archive
    zip_path = os.path.join(BACKUP_DIR, f"mis_backup_{timestamp_str}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(current_backup_folder):
            for file in files:
                file_path = os.path.join(root, file)
                zipf.write(file_path, os.path.relpath(file_path, current_backup_folder))

    print(f"============================================================")
    print(f" SUCCESS: Backup completed! Total records saved: {total_records}")
    print(f" Archive created: {zip_path}")
    print(f"============================================================")

if __name__ == "__main__":
    run_backup()

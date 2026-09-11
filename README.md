# Medical Inventory Management System (MIS)

An enterprise-grade, full-stack **Medical Inventory Management System (MIS)** designed for hospitals, pharmacies, clinics, and pharmaceutical supply chains. Built using the **MERN Stack** (MongoDB, Express.js, React 19, Node.js + TypeScript).

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**
   - Granular roles: `Admin`, `Pharmacist`, `Inventory Manager`, and `Staff`.
   - Secure JWT token authentication with protected routes.

2. **Executive Real-Time Dashboard**
   - Instant metrics: Active Stock, Low Stock, Expiring Soon, Out of Stock, Today's Purchases, and Dispensing Revenue.
   - Live inventory financial valuation.

3. **Medicine Master & Dynamic Classification**
   - Database-driven dosage forms (Tablets, Capsules, Syrups, Injections, Inhalers, Drops, etc.).
   - Therapeutic categories (Analgesic, Antibiotic, Antiviral, Antidiabetic, etc.).
   - Manufacturer directory management.

4. **Universal QR / Barcode / GS1 DataMatrix Scanner Hub**
   - Real-time webcam viewfinder, image upload, and manual lookup.
   - Instant medicine identification and active stock preview.
   - Quick Inward Goods scan directly from the camera feed.
   - Pre-filled registration modal for unrecognized medicine barcodes.

5. **Batch Management & FEFO Engine (First Expiry, First Out)**
   - Strict FEFO auto-allocation: Nearest-expiring batches are automatically dispensed first.
   - Hard lock on expired batches (`expiryDate <= now`) to prevent accidental dispensing.
   - Stock adjustments ledger (`DAMAGE`, `THEFT`, `DISCARD`, `CORRECTION`) with mandatory audit notes.

6. **Supplier & Purchase Order (PO) Management**
   - Vendor directory with GSTIN, contact, and address tracking.
   - Purchase order generation and 1-click receiving into batch inventory.

7. **POS Dispensing & Counter Billing**
   - High-speed medicine search and auto-allocation of valid batches.
   - Customer information, doctor name, and prescription reference tracking.
   - Thermal / A4 receipt generation with instant print preview.
   - Full returns and refunds with optional restock crediting.

8. **Automated Alerts & Expiry Incident Center**
   - Proactive scanners for low stock thresholds and expiry windows (30/60 days).
   - Severity tags: `CRITICAL`, `WARNING`, `INFO`.
   - Single-click or bulk resolution of alerts.

9. **Business Intelligence & Reporting**
   - Inventory Valuation (Cost vs. MRP with projected margins).
   - Sales velocity and dispensing history.
   - Expiry timeline forecasting.
   - Stagnant / Dead stock detection with 1-click CSV export.

10. **Multi-Branch Network & Stock Transfers**
    - Multi-facility tracking (Central Warehouse, City Dispensary, East Ward, etc.).
    - Inter-facility transfer protocol (`REQUESTED` -> `IN_TRANSIT` -> `RECEIVED`).

11. **Security Audit Logs & Organization Settings**
    - Immutable audit trails tracking user action, entity, IP address, and timestamp.
    - System settings configuration (Currency, Low Stock default, Expiry warning days).

12. **Automated Backups & Docker Support**
    - One-click Python backup utility (`scripts/backup_mongo.py`) producing zipped JSON archives.
    - Dockerized backend, frontend, and compose stack.

---

## 🚀 Running Services

| Service | Port | Local URL |
| :--- | :--- | :--- |
| **Frontend Web App** | `5173` | [http://localhost:5173](http://localhost:5173) |
| **Backend REST API** | `5001` | [http://localhost:5001/api](http://localhost:5001/api) |
| **Database** | `27017` | `mongodb://127.0.0.1:27017/medical_inventory` |

---

## 🔑 Default User Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@mis.local` | `Admin@12345` |
| **Pharmacist** | `pharmacist@mis.local` | `Pharma@12345` |
| **Inventory Manager** | `inventory@mis.local` | `Stock@12345` |
| **Staff** | `staff@mis.local` | `Staff@12345` |

---

## 🧪 Testing

To run the master end-to-end verification test suite covering all 10 modules:
```bash
python tests/run_all_tests.py
```

import subprocess
import sys
import time

TESTS = [
    ("Phase 1: Foundation, DB, Auth & Dashboard", "tests/test_phase1.py"),
    ("Phase 2: Medicine Master & Dynamic Categories", "tests/test_phase2.py"),
    ("Phase 3: QR / Barcode / DataMatrix Scanner Hub", "tests/test_phase3.py"),
    ("Phase 4: Batch Management & FEFO Stock Engine", "tests/test_phase4.py"),
    ("Phase 5: Suppliers & Purchases Goods Inward", "tests/test_phase5.py"),
    ("Phase 6: Sales / Dispensing & POS Billing", "tests/test_phase6.py"),
    ("Phase 7: Alerts & Expiry Incident Center", "tests/test_phase7.py"),
    ("Phase 8: Reports & Business Intelligence", "tests/test_phase8.py"),
    ("Phase 9: Multi-Branch & Inter-Facility Transfers", "tests/test_phase9.py"),
    ("Phase 10: Users, RBAC & Security Audit Logs", "tests/test_phase10_users_audit.py"),
]

def main():
    print("=" * 70)
    print("      MEDICAL INVENTORY MANAGEMENT SYSTEM (MIS) - TEST SUITE")
    print("=" * 70)
    
    passed = 0
    start_total = time.time()
    
    for phase_name, test_file in TESTS:
        print(f"\n>> Executing: {phase_name} ({test_file})...")
        t0 = time.time()
        res = subprocess.run([sys.executable, test_file], capture_output=True, text=True)
        duration = time.time() - t0
        
        if res.returncode == 0:
            passed += 1
            print(f"   [PASSED] in {duration:.2f}s")
        else:
            print(f"   [FAILED] in {duration:.2f}s")
            print("--- STDOUT ---")
            print(res.stdout)
            print("--- STDERR ---")
            print(res.stderr)
            print("----------------")
            sys.exit(1)
            
    total_duration = time.time() - start_total
    print("\n" + "=" * 70)
    print(f"   ALL {passed}/{len(TESTS)} TEST SUITES PASSED FLAWLESSLY (100% SUCCESS)")
    print(f"   Total Execution Time: {total_duration:.2f}s")
    print("=" * 70)

if __name__ == "__main__":
    main()

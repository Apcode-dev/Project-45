# Medical Inventory Android Conversion Rules

## Important

This is an existing production-ready Medical Inventory System.

The goal is to convert the existing React + Vite web application into an Android application using Capacitor.

- DO NOT rewrite the application in React Native.
- DO NOT replace the existing frontend architecture.
- DO NOT replace MongoDB/Mongoose.
- DO NOT replace the Node/Express backend.
- DO NOT remove existing features.
- DO NOT modify working business logic unless required for Android compatibility.
- DO NOT hardcode localhost URLs.
- DO NOT expose API keys or secrets.
- DO NOT commit .env files, keystores, APKs or sensitive credentials.

Before modifying any file:
1. Inspect the existing implementation.
2. Reuse existing functionality wherever possible.
3. Make the smallest safe change.
4. Preserve existing web functionality.
5. Verify the build after changes.

The Android application must use the same backend API and MongoDB database as the web application.

### Target:
React + Vite + Capacitor + Android

### Package ID:
`com.akash.medicalinventory`

### App Name:
`Medical Inventory System`

---

## 🏗️ Conversion Roadmap

```
PHASE 0: Backup + Git Checkpoint
  ↓
PHASE 1: Existing Website Audit
  ↓
PHASE 2: Production API Configuration
  ↓
PHASE 3: Capacitor Installation
  ↓
PHASE 4: Android Platform Setup
  ↓
PHASE 5: Android App Configuration
  ↓
PHASE 6: Camera + QR + Barcode Scanner Integration
  ↓
PHASE 7: Android Hardware Back Button + Navigation
  ↓
PHASE 8: App Icon + Splash Screen
  ↓
PHASE 9: Build + Capacitor Sync
  ↓
PHASE 10: Real Device Testing
  ↓
PHASE 11: Bug Fixes & Mobile UI Optimization
  ↓
PHASE 12: Debug APK Generation
  ↓
PHASE 13: Release Signing (Keystore Setup)
  ↓
PHASE 14: Final Signed Release APK
```

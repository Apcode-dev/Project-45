import React, { useState } from "react";
import { useAuth } from "./store/authStore.js";
import { LoginPage } from "./pages/auth/LoginPage.js";
import { Navbar } from "./components/layout/Navbar.js";
import { Sidebar } from "./components/layout/Sidebar.js";
import { DashboardPage } from "./pages/dashboard/DashboardPage.js";
import { MedicinesPage } from "./pages/medicines/MedicinesPage.js";
import { ScannerPage } from "./pages/scanner/ScannerPage.js";
import { InventoryPage } from "./pages/inventory/InventoryPage.js";
import { PurchasesPage } from "./pages/purchases/PurchasesPage.js";
import { SuppliersPage } from "./pages/suppliers/SuppliersPage.js";
import { SalesPage } from "./pages/sales/SalesPage.js";
import { AlertsPage } from "./pages/alerts/AlertsPage.js";
import { ReportsPage } from "./pages/reports/ReportsPage.js";
import { BranchesPage } from "./pages/branches/BranchesPage.js";
import { UsersPage } from "./pages/users/UsersPage.js";
import { AuditPage } from "./pages/audit/AuditPage.js";
import { SettingsPage } from "./pages/settings/SettingsPage.js";
import { ModulePlaceholder } from "./pages/ModulePlaceholder.js";
import { api } from "./services/api.js";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LayoutDashboard, QrCode, Pill, ShoppingCart, Menu, Boxes, ShieldAlert } from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

export function App() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Derive activeModule from current URL path (/medicines -> medicines)
  const currentPath = location.pathname.replace(/^\//, "") || "dashboard";
  const activeModule = currentPath;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [alertsCount, setAlertsCount] = useState<number>(0);

  const fetchAlertsCount = async () => {
    try {
      const res = await api.get("/alerts?isResolved=false");
      if (res.data?.success) {
        setAlertsCount(res.data.counts?.unresolved ?? 0);
      }
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchAlertsCount();
      const interval = setInterval(fetchAlertsCount, 12000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeModule]);

  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer position="top-right" autoClose={3200} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme="colored" className="z-[99999]" />
        <LoginPage onLoginSuccess={(loggedInUser, token) => login(loggedInUser, token)} />
      </>
    );
  }

  const handleNavigate = (mod: string) => {
    navigate(mod === "dashboard" ? "/" : `/${mod}`);
    setIsMobileMenuOpen(false);
  };

  const normalizedRole = (user?.role || "").toUpperCase().trim();
  // Pharmacist, Manager, and Staff cannot access Monitoring & Insights or Administration
  const isRestrictedRole = ["PHARMACIST", "MANAGER", "INVENTORY_MANAGER", "STAFF"].includes(normalizedRole);
  const isRestrictedModule = ["alerts", "reports", "users", "audit", "settings"].includes(activeModule);

  const renderModuleContent = () => {
    if (isRestrictedRole && isRestrictedModule) {
      return (
        <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-4">
            Security Notice: Aapka role ({user?.role}) is module (Monitoring & Insights / Administration) ke liye authorized nahi hai.
          </p>
          <button
            onClick={() => handleNavigate("dashboard")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Go to Dashboard
          </button>
        </div>
      );
    }
    switch (activeModule) {
      case "dashboard":
        return <DashboardPage onNavigate={(mod) => handleNavigate(mod)} />;
      case "medicines":
        return <MedicinesPage />;
      case "scanner":
        return <ScannerPage />;
      case "inventory":
        return <InventoryPage />;
      case "purchases":
        return <PurchasesPage />;
      case "suppliers":
        return <SuppliersPage />;
      case "sales":
        return <SalesPage />;
      case "alerts":
        return <AlertsPage onNavigate={(mod) => handleNavigate(mod)} onAlertsUpdated={fetchAlertsCount} />;
      case "reports":
        return <ReportsPage />;
      case "branches":
        return <BranchesPage />;
      case "users":
        return <UsersPage />;
      case "audit":
        return <AuditPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <ModulePlaceholder moduleId={activeModule} />;
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex flex-col w-full overflow-hidden bg-slate-50">
      <ToastContainer position="top-right" autoClose={3200} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme="colored" className="z-[99999]" />
      {/* Top Navigation (Fixed at top) */}
      <Navbar 
        onModuleChange={(mod) => handleNavigate(mod)} 
        isMobileOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onLogout={logout}
        alertsCount={alertsCount}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Modular Sidebar (Desktop Persistent & Mobile Drawer) */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={(mod) => handleNavigate(mod)}
          userRole={user?.role}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onLogout={logout}
          alertsCount={alertsCount}
        />

        {/* Main Content Area (Scrolls smoothly to the very bottom with mobile bottom clearance buffer) */}
        <main className="flex-1 h-full min-h-0 min-w-0 overflow-y-auto p-3 sm:p-5 lg:p-8 pb-40 sm:pb-36 lg:pb-8 bg-slate-50 mobile-touch-scroll">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {renderModuleContent()}
            {/* Mobile bottom clearance spacer: ensures tables, buttons, totals are 100% visible and never clipped behind the mobile bottom bar */}
            <div className="h-16 lg:hidden w-full shrink-0" aria-hidden="true" />
          </div>
        </main>
      </div>

      {/* Mobile & Tablet Bottom Navigation Bar (High Frequency Actions) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-2 px-1 text-slate-400 shadow-2xl safe-area-bottom">
        <button
          onClick={() => handleNavigate("dashboard")}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeModule === "dashboard" ? "text-emerald-400 font-semibold" : "hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => handleNavigate("scanner")}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all relative ${
            activeModule === "scanner" ? "text-emerald-400 font-semibold" : "hover:text-white"
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center -mt-3 shadow-lg shadow-emerald-600/40">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">Scan</span>
        </button>

        <button
          onClick={() => handleNavigate("medicines")}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeModule === "medicines" ? "text-emerald-400 font-semibold" : "hover:text-white"
          }`}
        >
          <Pill className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Catalog</span>
        </button>

        <button
          onClick={() => handleNavigate("sales")}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeModule === "sales" ? "text-emerald-400 font-semibold" : "hover:text-white"
          }`}
        >
          <ShoppingCart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">POS</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            isMobileMenuOpen ? "text-emerald-400 font-semibold" : "hover:text-white"
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>
    </div>
  );
}

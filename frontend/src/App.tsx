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

import { LayoutDashboard, QrCode, Pill, ShoppingCart, Menu, Boxes } from "lucide-react";

export function App() {
  const { isAuthenticated, user, login } = useAuth();
  const [activeModule, setActiveModule] = useState<string>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={(loggedInUser, token) => login(loggedInUser, token)} />;
  }

  const handleNavigate = (mod: string) => {
    setActiveModule(mod);
    setIsMobileMenuOpen(false);
  };

  const renderModuleContent = () => {
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
        return <AlertsPage onNavigate={(mod) => handleNavigate(mod)} />;
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
    <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar 
        onModuleChange={(mod) => handleNavigate(mod)} 
        isMobileOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Modular Sidebar (Desktop Persistent & Mobile Drawer) */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={(mod) => handleNavigate(mod)}
          userRole={user?.role}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 pb-24 lg:pb-8 bg-slate-50 w-full min-w-0">
          <div className="max-w-7xl mx-auto w-full">
            {renderModuleContent()}
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

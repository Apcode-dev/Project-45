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

export function App() {
  const { isAuthenticated, user, login } = useAuth();
  const [activeModule, setActiveModule] = useState<string>("dashboard");

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={(loggedInUser, token) => login(loggedInUser, token)} />;
  }

  const renderModuleContent = () => {
    switch (activeModule) {
      case "dashboard":
        return <DashboardPage onNavigate={(mod) => setActiveModule(mod)} />;
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
        return <AlertsPage onNavigate={(mod) => setActiveModule(mod)} />;
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar onModuleChange={(mod) => setActiveModule(mod)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Modular Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={(mod) => setActiveModule(mod)}
          userRole={user?.role}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {renderModuleContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

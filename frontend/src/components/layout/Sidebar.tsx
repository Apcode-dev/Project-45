import React from "react";
import {
  LayoutDashboard,
  QrCode,
  Pill,
  Boxes,
  Truck,
  ShoppingCart,
  Building,
  AlertTriangle,
  FileBarChart,
  Settings,
  ShieldAlert,
  Users,
  ChevronRight,
  LucideIcon,
  X,
  Activity,
  LogOut,
} from "lucide-react";
import { performLogout } from "../../store/authStore.js";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
  badge?: string;
  badgeColor?: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  activeModule: string;
  onSelectModule: (id: string) => void;
  userRole?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
  alertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  userRole = "ADMIN",
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
  alertsCount = 0,
}) => {
  const navSections: NavSection[] = [
    {
      title: "Core Operations",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "scanner", label: "QR / Barcode Scanner", icon: QrCode, highlight: true },
        { id: "medicines", label: "Medicines Master", icon: Pill },
        { id: "inventory", label: "Inventory & Batches", icon: Boxes, badge: "FEFO" },
      ],
    },
    {
      title: "Transactions",
      items: [
        { id: "sales", label: "Sales / Dispensing", icon: ShoppingCart },
        { id: "purchases", label: "Purchases & Inward", icon: Truck },
        { id: "suppliers", label: "Suppliers Ledger", icon: Building },
      ],
    },
    {
      title: "Monitoring & Insights",
      items: [
        {
          id: "alerts",
          label: "Alerts Center",
          icon: AlertTriangle,
          badge: alertsCount > 0 ? String(alertsCount) : undefined,
          badgeColor: "bg-rose-500 text-white animate-pulse shadow-xs",
        },
        { id: "reports", label: "Reports & Valuation", icon: FileBarChart },
      ],
    },
    {
      title: "Administration",
      items: [
        { id: "users", label: "Users & Roles", icon: Users, adminOnly: true },
        { id: "audit", label: "Audit & Security Logs", icon: ShieldAlert, adminOnly: true },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onSelectModule(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const normalizedRole = (userRole || "").toUpperCase().trim();
  // Pharmacist, Manager, and Staff cannot view Monitoring & Insights and Administration
  const isRestrictedRole = ["PHARMACIST", "MANAGER", "INVENTORY_MANAGER", "STAFF"].includes(normalizedRole);

  const visibleSections = navSections.filter((section) => {
    if (isRestrictedRole) {
      if (section.title === "Monitoring & Insights" || section.title === "Administration") {
        return false;
      }
    }
    return true;
  });

  const navContent = (
    <>
      <div className="p-3 space-y-5 overflow-y-auto sidebar-scroll flex-1">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {section.title}
            </div>
            <div className="space-y-0.5 mt-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? "bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? "text-white" : item.highlight ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.badgeColor || (isActive ? "bg-white text-emerald-700" : "bg-slate-800 text-slate-300")
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : isActive ? (
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info & Logout button */}
      <div className="p-3.5 border-t border-slate-800 text-xs text-slate-400 flex flex-col space-y-2.5 shrink-0 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px]">
          <span>Active Role:</span>
          <span className="font-semibold text-emerald-400">{userRole}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Database:</span>
          <span className="text-emerald-400/80 font-mono text-[10px]">MongoDB 7.0 (FEFO)</span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            if (onLogout) {
              onLogout();
            } else {
              performLogout();
            }
          }}
          className="w-full mt-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out / Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (Hidden on mobile/tablet) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 h-full max-h-full flex-col justify-between select-none border-r border-slate-800 shrink-0 overflow-hidden">
        {navContent}
      </aside>

      {/* 2. Mobile / Tablet Drawer Overlay & Slide-out Panel */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Body */}
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 h-full max-h-full flex flex-col justify-between shadow-2xl z-50 border-r border-slate-800 select-none overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">MedFlow MIS</div>
                  <div className="text-[10px] text-emerald-400">Navigation Menu</div>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reusable Nav Items */}
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};

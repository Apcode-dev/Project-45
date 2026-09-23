import React, { useState } from "react";
import { useAuth } from "../../store/authStore.js";
import { 
  Building2, 
  Bell, 
  LogOut, 
  ShieldCheck, 
  User as UserIcon,
  Activity,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { ProfileModal, UserAvatarDisplay } from "../profile/ProfileModal.js";

interface NavbarProps {
  onModuleChange?: (module: string) => void;
  isMobileOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onLogout?: () => void;
  alertsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onModuleChange,
  isMobileOpen = false,
  onToggleMobileMenu,
  onLogout,
  alertsCount = 0,
}) => {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const getRoleBadgeColor = (role: string = "") => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "DR":
      case "DOCTOR":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "PHARMACIST":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "MANAGER":
      case "INVENTORY_MANAGER":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "STAFF":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const normalizedRole = (user?.role || "").toUpperCase().trim();
  // Pharmacist, Manager, Staff cannot access Monitoring/Alerts
  const isRestrictedRole = ["PHARMACIST", "MANAGER", "INVENTORY_MANAGER", "STAFF"].includes(normalizedRole);

  return (
    <header className="h-16 shrink-0 w-full bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & Branch */}
      <div className="flex items-center space-x-2.5 sm:space-x-4">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Toggle navigation drawer"
          >
            {isMobileOpen ? <X className="w-6 h-6 text-slate-800" /> : <Menu className="w-6 h-6 text-slate-800" />}
          </button>
        )}

        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">MedFlow</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Medical Inventory System</p>
          </div>
        </div>

        <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Central Pharmacy</span>
        </div>
      </div>

      {/* Right User actions */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Alerts quick button (Admin & Dr only) */}
        {!isRestrictedRole && (
          <button
            onClick={() => onModuleChange && onModuleChange("alerts")}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title={alertsCount > 0 ? `${alertsCount} Unresolved Alert(s)` : "No Active Alerts"}
          >
            <Bell className="w-5 h-5" />
            {alertsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse shadow-xs">
                {alertsCount > 99 ? "99+" : alertsCount}
              </span>
            )}
          </button>
        )}

        {/* User profile card - Click to open Profile & Avatar Settings */}
        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center space-x-2.5 sm:space-x-3 pl-2 sm:pl-3 border-l border-slate-200 hover:bg-slate-50 active:bg-slate-100 p-1.5 rounded-2xl transition-all cursor-pointer group text-left"
          title="Click to view & edit profile"
          aria-label="User profile settings"
        >
          <div className="relative shrink-0">
            <UserAvatarDisplay
              avatar={user?.avatar}
              name={user?.name}
              role={user?.role}
              size="md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors flex items-center gap-1">
              <span>{user?.name || "Medical Staff"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(user?.role)}`}>
                {user?.role || "STAFF"}
              </span>
            </div>
          </div>
        </button>

        {/* Logout button */}
        <button
          type="button"
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              logout();
            }
          }}
          className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50/60 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-all cursor-pointer shadow-2xs"
          title="Sign out of system"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-600" />
          <span className="text-[11px] sm:text-xs font-bold text-rose-700">Logout</span>
        </button>
      </div>

      {/* Profile Popup Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};

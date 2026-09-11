import React from "react";
import { useAuth } from "../../store/authStore.js";
import { 
  Building2, 
  Bell, 
  LogOut, 
  ShieldCheck, 
  User as UserIcon,
  Activity
} from "lucide-react";

interface NavbarProps {
  onModuleChange?: (module: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onModuleChange }) => {
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role: string = "") => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "PHARMACIST":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "INVENTORY_MANAGER":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "STAFF":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand & Branch */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">MedFlow MIS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                v1.0 Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Medical Inventory & Dispensing System</p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Central Pharmacy (Main Branch)</span>
        </div>
      </div>

      {/* Right User actions */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Alerts quick button */}
        <button
          onClick={() => onModuleChange && onModuleChange("alerts")}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title="View Alerts"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
        </button>

        {/* User profile card */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
            {user?.name ? user.name.charAt(0) : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.name || "Medical Staff"}
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(user?.role)}`}>
                {user?.role || "STAFF"}
              </span>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
          title="Sign out of system"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

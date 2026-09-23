import React, { useState } from "react";
import { api } from "../../services/api.js";
import { showToast } from "../../utils/toast.js";
import { Activity, ShieldCheck, Lock, Mail, Briefcase, ArrowRight, AlertCircle, X, ShieldAlert } from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState("ADMIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification popup modal state
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      if (response.data.success) {
        showToast.success(`Welcome back, ${response.data.data?.user?.name || "User"}!`);
        onLoginSuccess(response.data.data.user, response.data.data.token);
      } else {
        const msg = response.data.error || "Kripya Admin se ID create karwaye and verify karaye.";
        setError(msg);
        setPopupMessage(msg);
        setShowPopup(true);
        showToast.error(msg);
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Account nahi mila! Kripya Admin se ID create karwaye and verify karaye.";
      setError(serverMsg);
      setPopupMessage(serverMsg);
      setShowPopup(true);
      showToast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white relative">
      {/* Verification Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative transform transition-all">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50 shadow-sm">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Verification Required / Access Denied
              </h3>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900 font-semibold mb-3 w-full text-left leading-relaxed">
                ⚠️ {popupMessage}
              </div>

              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Aapka ID & Password match nahi hua ya selected role authorized nahi hai.
                <br />
                <span className="font-semibold text-slate-700">
                  Kripya Hospital Admin se apni ID create karwaye aur account verify karaye.
                </span>
              </p>

              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20"
              >
                Theek Hai (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/30 mb-4 ring-8 ring-emerald-500/10">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            MedFlow MIS
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Enterprise Medical Inventory & Batch Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Sign In to Workspace
              </h2>
              <p className="text-xs text-slate-500">
                Select your assigned role and enter credentials
              </p>
            </div>
            <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RBAC Secured</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Your System Role
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                >
                  <option value="ADMIN">1. Admin</option>
                  <option value="DR">2. Dr</option>
                  <option value="PHARMACIST">3. Pharmacist</option>
                  <option value="MANAGER">4. Manager</option>
                  <option value="STAFF">5. Staff</option>
                </select>
              </div>
            </div>

            {/* Email Address Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@mis.local"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Help Notice */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              New staff member? Contact your <span className="font-semibold text-slate-700">Hospital Admin</span> to generate your login ID and verify account permissions.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Medical Inventory System &bull; FEFO Batch Engine &bull; Confidential
        </div>
      </div>
    </div>
  );
};

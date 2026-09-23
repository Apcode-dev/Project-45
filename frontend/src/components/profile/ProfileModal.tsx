import React, { useState, useRef } from "react";
import { useAuth } from "../../store/authStore.js";
import { api } from "../../services/api.js";
import { showToast } from "../../utils/toast.js";
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Check,
  Camera,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Pill,
  Building2,
  Activity,
  HeartPulse,
  FlaskConical,
  Dna,
  BadgeAlert,
  Sparkles,
} from "lucide-react";

export interface ProfileIconOption {
  id: string;
  label: string;
  iconName: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badge: string;
}

export const PROFILE_ICONS: ProfileIconOption[] = [
  {
    id: "doctor-teal",
    label: "Doctor (Teal)",
    iconName: "stethoscope",
    bgClass: "bg-teal-500",
    textClass: "text-white",
    borderClass: "border-teal-600",
    badge: "Dr",
  },
  {
    id: "doctor-emerald",
    label: "Senior Doctor",
    iconName: "heart-pulse",
    bgClass: "bg-emerald-600",
    textClass: "text-white",
    borderClass: "border-emerald-700",
    badge: "Dr",
  },
  {
    id: "pharmacist-sky",
    label: "Pharmacist",
    iconName: "pill",
    bgClass: "bg-sky-500",
    textClass: "text-white",
    borderClass: "border-sky-600",
    badge: "Pharma",
  },
  {
    id: "admin-purple",
    label: "System Admin",
    iconName: "shield-check",
    bgClass: "bg-purple-600",
    textClass: "text-white",
    borderClass: "border-purple-700",
    badge: "Admin",
  },
  {
    id: "manager-amber",
    label: "Inventory Manager",
    iconName: "building",
    bgClass: "bg-amber-500",
    textClass: "text-white",
    borderClass: "border-amber-600",
    badge: "Manager",
  },
  {
    id: "staff-indigo",
    label: "Hospital Staff",
    iconName: "user",
    bgClass: "bg-indigo-500",
    textClass: "text-white",
    borderClass: "border-indigo-600",
    badge: "Staff",
  },
  {
    id: "clinical-rose",
    label: "Emergency / Clinic",
    iconName: "activity",
    bgClass: "bg-rose-500",
    textClass: "text-white",
    borderClass: "border-rose-600",
    badge: "Care",
  },
  {
    id: "lab-violet",
    label: "Diagnostic Lab",
    iconName: "flask",
    bgClass: "bg-violet-600",
    textClass: "text-white",
    borderClass: "border-violet-700",
    badge: "Lab",
  },
  {
    id: "research-cyan",
    label: "Genetics / Pharma R&D",
    iconName: "dna",
    bgClass: "bg-cyan-600",
    textClass: "text-white",
    borderClass: "border-cyan-700",
    badge: "R&D",
  },
  {
    id: "safety-blue",
    label: "Quality & Safety",
    iconName: "badge",
    bgClass: "bg-blue-600",
    textClass: "text-white",
    borderClass: "border-blue-700",
    badge: "QA",
  },
];

// Helper to render icon by name
export const renderAvatarIcon = (iconName: string, className = "w-5 h-5") => {
  switch (iconName) {
    case "stethoscope":
      return <Stethoscope className={className} />;
    case "heart-pulse":
      return <HeartPulse className={className} />;
    case "pill":
      return <Pill className={className} />;
    case "shield-check":
      return <ShieldCheck className={className} />;
    case "building":
      return <Building2 className={className} />;
    case "activity":
      return <Activity className={className} />;
    case "flask":
      return <FlaskConical className={className} />;
    case "dna":
      return <Dna className={className} />;
    case "badge":
      return <BadgeAlert className={className} />;
    default:
      return <UserIcon className={className} />;
  }
};

// Generic Avatar Renderer
export const UserAvatarDisplay: React.FC<{
  avatar?: string | null;
  name?: string;
  role?: string;
  size?: "sm" | "md" | "lg" | "xl";
}> = ({ avatar, name, role, size = "md" }) => {
  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 sm:w-10 sm:h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-7 h-7",
    xl: "w-10 h-10",
  };

  // If avatar is custom image data URL
  if (avatar && (avatar.startsWith("data:image") || avatar.startsWith("http"))) {
    return (
      <img
        src={avatar}
        alt={name || "User Avatar"}
        className={`${sizeClasses[size]} rounded-2xl object-cover shadow-sm border border-slate-200`}
      />
    );
  }

  // If avatar matches a preset icon
  const preset = PROFILE_ICONS.find((p) => p.id === avatar);
  if (preset) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-2xl ${preset.bgClass} ${preset.textClass} flex items-center justify-center font-bold shadow-md shadow-slate-900/10 border ${preset.borderClass}`}
      >
        {renderAvatarIcon(preset.iconName, iconSizes[size])}
      </div>
    );
  }

  // Fallback based on Role color + Initial
  const getRoleTheme = (userRole = "") => {
    switch (userRole.toUpperCase()) {
      case "ADMIN":
        return "bg-purple-600 text-white";
      case "DR":
      case "DOCTOR":
        return "bg-teal-600 text-white";
      case "PHARMACIST":
        return "bg-sky-600 text-white";
      case "MANAGER":
      case "INVENTORY_MANAGER":
        return "bg-amber-600 text-white";
      case "STAFF":
        return "bg-indigo-600 text-white";
      default:
        return "bg-slate-700 text-white";
    }
  };

  const initial = (name || "U").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} rounded-2xl ${getRoleTheme(role)} flex items-center justify-center font-bold shadow-sm`}
    >
      {initial}
    </div>
  );
};

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user?.avatar || "doctor-teal");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectIcon = (iconId: string) => {
    setSelectedAvatar(iconId);
    setErrorMsg(null);
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Kripya valid image file (.jpg, .png) select karein.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image size 2MB se kam hona chahiye.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedAvatar(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg("Name khali nahi ho sakta.");
      return;
    }

    if (showPasswordSection && newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg("New password kam se kam 6 characters ka hona chahiye.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("New password aur Confirm password match nahi ho rahe.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        avatar: selectedAvatar,
      };

      if (showPasswordSection && newPassword) {
        payload.password = newPassword.trim();
        if (currentPassword) {
          payload.currentPassword = currentPassword.trim();
        }
      }

      const res = await api.put("/auth/profile", payload);
      if (res.data.success) {
        updateUser(res.data.data);
        showToast.success("Profile safaltapoorvak update ho gayi!");
        setSuccessMsg("Profile safaltapoorvak update ho gayi!");
        // Reset password fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordSection(false);

        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } else {
        const errMsg = res.data.error || "Profile update nahi ho saki.";
        setErrorMsg(errMsg);
        showToast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Profile update karte samay error aaya.";
      setErrorMsg(errMsg);
      showToast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">My Profile & Settings</h3>
              <p className="text-xs text-slate-400">Manage your avatar and hospital credentials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSaveProfile} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center space-x-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Current Avatar Preview Banner */}
          <div className="flex items-center space-x-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className="relative">
              <UserAvatarDisplay avatar={selectedAvatar} name={name} role={user?.role} size="lg" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1 bg-white hover:bg-slate-100 rounded-full border border-slate-300 shadow-xs text-slate-700 transition-transform active:scale-95 cursor-pointer"
                title="Upload custom image"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-slate-900 text-sm truncate">{name || "User"}</h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md shrink-0">
                  {user?.role || "STAFF"}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
              <div className="mt-1.5 flex items-center space-x-2 text-[11px] text-emerald-700 font-medium">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Niche profile icon choose karein</span>
              </div>
            </div>
          </div>

          {/* Hidden File Input for Custom Photo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomImageUpload}
          />

          {/* Choose Profile Icon Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Choose Profile Icon <span className="text-slate-400 font-normal">(Select an avatar)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Custom Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
              {PROFILE_ICONS.map((opt) => {
                const isSelected = selectedAvatar === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectIcon(opt.id)}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white ring-2 ring-emerald-500 shadow-md scale-105"
                        : "hover:bg-white/80 hover:shadow-xs opacity-75 hover:opacity-100"
                    }`}
                    title={opt.label}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${opt.bgClass} ${opt.textClass} flex items-center justify-center shadow-xs border ${opt.borderClass}`}
                    >
                      {renderAvatarIcon(opt.iconName, "w-4 h-4")}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 mt-1 truncate max-w-full">
                      {opt.badge}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Basic User Information Fields */}
          <div className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aapka Poora Naam"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal">(Hospital login ID)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-600 cursor-not-allowed"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Change Password Collapsible Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">Security & Password</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                {showPasswordSection ? "Cancel Password Change" : "Change Password"}
              </button>
            </div>

            {showPasswordSection && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password dalein"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Naya password (min 6 chars)"
                        className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

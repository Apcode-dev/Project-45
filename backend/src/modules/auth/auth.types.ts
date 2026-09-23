export interface LoginPayload {
  email: string;
  password: string;
  role?: "ADMIN" | "DR" | "DOCTOR" | "PHARMACIST" | "MANAGER" | "INVENTORY_MANAGER" | "STAFF";
}

export interface RegisterPayload {
  name: string;
  email: string;
  role: "ADMIN" | "DR" | "DOCTOR" | "PHARMACIST" | "MANAGER" | "INVENTORY_MANAGER" | "STAFF";
  password: string;
}

export const getRolePermissions = (role: string): string[] => {
  switch (role?.toUpperCase()) {
    case "ADMIN":
      return ["*"];
    case "DR":
    case "DOCTOR":
      return [
        "dashboard:read",
        "medicines:read",
        "inventory:read",
        "batches:read",
        "sales:read",
        "sales:write",
        "scanner:read",
        "alerts:read",
        "reports:read",
      ];
    case "PHARMACIST":
      return ["medicines:read", "medicines:write", "sales:write", "batches:read", "scanner:read"];
    case "MANAGER":
    case "INVENTORY_MANAGER":
      return [
        "medicines:read",
        "medicines:write",
        "batches:read",
        "batches:write",
        "purchases:write",
        "inventory:write",
        "scanner:read",
      ];
    case "STAFF":
    default:
      return ["medicines:read", "sales:write", "scanner:read"];
  }
};

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    avatar?: string | null;
    role: string;
    permissions: string[];
  };
}


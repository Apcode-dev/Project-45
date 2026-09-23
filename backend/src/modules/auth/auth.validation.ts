import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["ADMIN", "DR", "DOCTOR", "PHARMACIST", "MANAGER", "INVENTORY_MANAGER", "STAFF"]).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "DR", "DOCTOR", "PHARMACIST", "MANAGER", "INVENTORY_MANAGER", "STAFF"], {
    errorMap: () => ({ message: "Role must be ADMIN, DR, PHARMACIST, MANAGER, or STAFF" }),
  }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || "10000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medical_inventory",
  JWT_SECRET: process.env.JWT_SECRET || "mis_production_jwt_secure_token_key_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  BREVO_API_KEY: process.env.BREVO_API_KEY || "",
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "ap.code.in@gmail.com",
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "Medical Stock Alert System",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || "ap.code.in@gmail.com",
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || "apcodein",
  SEED_DEMO_PASSWORD: process.env.SEED_DEMO_PASSWORD || "Demo@MIS#2026!Pass",
};

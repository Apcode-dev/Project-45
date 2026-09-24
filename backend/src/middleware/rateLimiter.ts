import rateLimit from "express-rate-limit";

// Rate limiter for Login (Item 19): 10 attempts per 15 minutes window
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: "Bohat zyaada login attempts ho gaye hain. Security ke liye 15 minute baad try karein.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for Registration (Item 20): 5 attempts per 60 minutes window
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: "Registration attempts limit reach ho gayi hai. Kripya 1 ghante baad dobara try karein.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

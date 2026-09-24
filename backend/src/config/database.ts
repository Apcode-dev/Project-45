import mongoose from "mongoose";
import { ENV } from "./environment.js";

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(ENV.MONGODB_URI);
    console.log("[MongoDB] Connected successfully");
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected from database");
});

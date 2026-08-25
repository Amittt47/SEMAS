import mongoose from "mongoose";
import { logger } from "./logger";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/sentinel_siem";

  mongoose.connection.on("connected", () =>
    logger.info(`✅  MongoDB connected → ${mongoose.connection.host}`)
  );
  mongoose.connection.on("error", (err) =>
    logger.error("MongoDB connection error:", err)
  );
  mongoose.connection.on("disconnected", () =>
    logger.warn("MongoDB disconnected — retrying…")
  );

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

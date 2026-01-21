import mongoose from "mongoose";
import { initGridFS } from "./gridfs"; // ✅ IMPORT REQUIRED

const connectToMongo = async () => {
  const uri = process.env.MONGO_URI; // 🔥 FIXED NAME

  if (!uri) {
    throw new Error("MONGODB_URL is not defined in environment variables");
  }

  try {
    // ✅ CONNECT FIRST
    await mongoose.connect(uri);

    console.log("✅ Connected to MongoDB successfully");

    // ✅ INIT GRIDFS AFTER CONNECTION
    mongoose.connection.once("open", () => {
      initGridFS();
      console.log("🗂 GridFS initialized");
    });
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
    throw err; // important for crash on failure
  }
};

export default connectToMongo;

import mongoose from "mongoose";

const connectToMongo = async () => {
  const uri = process.env.MONGODB_URI; // 🔥 FIXED NAME

  if (!uri) {
    throw new Error("MONGODB_URL is not defined in environment variables");
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
    throw err; // 🔥 IMPORTANT
  }
};

export default connectToMongo;

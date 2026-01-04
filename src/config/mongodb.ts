import mongoose from "mongoose";

const connectToMongo = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error(" MONGODB_URI is not defined in environment variables");
    }

    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB successfully");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1);
    }
};

export default connectToMongo;

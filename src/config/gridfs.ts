import mongoose from "mongoose";

let gfs: mongoose.mongo.GridFSBucket | null = null;

export const initGridFS = () => {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not ready for GridFS");
  }

  gfs = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "avatars",
  });
};

export const getGridFS = (): mongoose.mongo.GridFSBucket => {
  if (!gfs) {
    throw new Error("GridFS is not initialized");
  }
  return gfs;
};

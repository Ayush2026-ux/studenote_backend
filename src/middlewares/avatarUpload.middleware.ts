import multer from "multer";
import path from "path";
import os from "os";

/* ================= AVATAR UPLOAD ================= */

// ✅ Android / Expo safe temp storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});

// ✅ Only images allowed
const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }
  cb(null, true);
};

export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter,
}).single("avatar");

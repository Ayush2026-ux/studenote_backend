import multer from "multer";
import path from "path";
import os from "os";

// ✅ Disk storage (ANDROID SAFE)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir()); 
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (["thumbnail", "image", "cover"].includes(file.fieldname)) {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    return cb(new Error("Thumbnail must be an image"));
  }

  if (["files", "file", "pdf", "document"].includes(file.fieldname)) {
    if (file.mimetype === "application/pdf") return cb(null, true);
    return cb(new Error("Notes file must be a PDF"));
  }

  cb(new Error(`Unexpected field name: ${file.fieldname}`));
};

export const uploadNoteFiles = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 2,
  },
  fileFilter,
}).fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "image", maxCount: 1 },
  { name: "cover", maxCount: 1 },
  { name: "files", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);

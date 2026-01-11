import supabase from "../../config/supabase";
import axios from "axios";
import { promises as fs } from "fs";

export const uploadToSupabase = async (
    file: Express.Multer.File,
    folder: string
): Promise<string> => {

    if (!file) {
        throw new Error("No file provided for upload");
    }

    /* ================= SAFE FILE NAME ================= */

    const safeFileName = file.originalname
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9._-]/g, "");

    const filePath = `${folder}/${Date.now()}_${safeFileName}`;

    /* ================= READ FILE DATA (ANDROID FIX) ================= */

    let fileData: Buffer;

    if (file.buffer) {
        // ✅ Web / memoryStorage
        fileData = file.buffer;
    } else if (file.path) {
        // ✅ Android / diskStorage
        fileData = await fs.readFile(file.path);
    } else {
        throw new Error("Unable to read uploaded file data");
    }

    /* ================= UPLOAD TO SUPABASE ================= */

    const { error } = await supabase.storage
        .from("studenote")
        .upload(filePath, fileData, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        console.error("SUPABASE UPLOAD ERROR:", error);
        throw new Error(`Supabase Upload Error: ${error.message}`);
    }

    /* ================= GENERATE PUBLIC URL ================= */

    const { data } = supabase.storage
        .from("studenote")
        .getPublicUrl(filePath);

    const publicUrl = data?.publicUrl;

    if (!publicUrl) {
        throw new Error("Failed to generate public URL");
    }

    console.log("SUPABASE PUBLIC URL:", publicUrl);

    /* ================= VERIFY FILE ACCESS ================= */

    try {
        const test = await axios.get(publicUrl, {
            responseType: "arraybuffer",
            validateStatus: () => true,
        });

        console.log("SUPABASE FILE STATUS:", test.status);
        console.log("SUPABASE FILE TYPE:", test.headers["content-type"]);

        if (test.status !== 200) {
            console.error(
                "SUPABASE FILE ERROR BODY:",
                Buffer.from(test.data).toString()
            );
            throw new Error("Uploaded file is not publicly accessible");
        }
    } catch (err) {
        console.error("SUPABASE FILE VERIFY FAILED:", err);
        throw new Error("Supabase file verification failed");
    }

    /* ================= SUCCESS ================= */

    return publicUrl;
};

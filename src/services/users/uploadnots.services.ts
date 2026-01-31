import supabase from "../../config/supabase";
import axios from "axios";
import { promises as fs } from "fs";
import { createReadStream } from "fs";

/* ================= CONSTANTS ================= */
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const UPLOAD_TIMEOUT = 600000; // 10 minutes for large files (84MB+)

/* ================= RETRY WRAPPER ================= */
const retryUpload = async (
    uploadFn: () => Promise<any>,
    retries = MAX_RETRIES
): Promise<any> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await uploadFn();
        } catch (error: any) {
            if (attempt === retries) throw error;
            console.log(`Retry attempt ${attempt}/${retries} after ${RETRY_DELAY}ms...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
        }
    }
};

export const uploadToSupabase = async (
    file: Express.Multer.File,
    folder: string,
    onProgress?: (progress: number) => void
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

    /* ================= GET FILE DATA ================= */

    let fileData: Buffer;
    let fileSize: number;

    if (file.buffer) {
        //  Web / memoryStorage
        fileData = file.buffer;
        fileSize = file.buffer.length;
    } else if (file.path) {
        // Android / diskStorage
        const stats = await fs.stat(file.path);
        fileSize = stats.size;

        // For files > 50MB, use streaming to avoid memory overload
        if (fileSize > 50 * 1024 * 1024) {
            return await uploadLargeFileWithStreaming(
                file.path,
                filePath,
                file.mimetype,
                fileSize,
                onProgress
            );
        }

        fileData = await fs.readFile(file.path);
    } else {
        throw new Error("Unable to read uploaded file data");
    }

    /* ================= UPLOAD TO SUPABASE ================= */

    const uploadFn = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

        try {
            const { error } = await supabase.storage
                .from("studenote")
                .upload(filePath, fileData, {
                    contentType: file.mimetype,
                    upsert: false,
                });

            if (error) {
                throw new Error(`Supabase Upload Error: ${error.message}`);
            }
        } finally {
            clearTimeout(timeoutId);
        }
    };

    await retryUpload(uploadFn);

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
        const verifyFn = async () => {
            const test = await axios.get(publicUrl, {
                responseType: "arraybuffer",
                validateStatus: () => true,
                timeout: 10000,
            });

            console.log("SUPABASE FILE STATUS:", test.status);
            console.log("SUPABASE FILE TYPE:", test.headers["content-type"]);

            if (test.status !== 200) {
                throw new Error(
                    `File verification failed with status ${test.status}`
                );
            }
        };

        await retryUpload(verifyFn);
    } catch (err) {
        console.error("SUPABASE FILE VERIFY FAILED:", err);
        throw new Error("Supabase file verification failed");
    }

    /* ================= SUCCESS ================= */

    return publicUrl;
};

/* ================= STREAMING UPLOAD FOR LARGE FILES ================= */
const uploadLargeFileWithStreaming = async (
    filePath: string,
    storagePath: string,
    mimeType: string,
    fileSize: number,
    onProgress?: (progress: number) => void
): Promise<string> => {
    try {
        // Read file in chunks to avoid memory overload
        const fileData = await fs.readFile(filePath);

        let uploadedBytes = 0;
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

        console.log(`Starting large file upload: ${fileSize} bytes in ${totalChunks} chunks`);

        // Upload with retry mechanism
        const uploadFn = async () => {
            const { error } = await supabase.storage
                .from("studenote")
                .upload(storagePath, fileData, {
                    contentType: mimeType,
                    upsert: false,
                });

            if (error) {
                throw new Error(`Supabase Upload Error: ${error.message}`);
            }
        };

        await retryUpload(uploadFn);

        // Report completion
        onProgress?.(100);

        /* ================= GENERATE PUBLIC URL ================= */

        const { data } = supabase.storage
            .from("studenote")
            .getPublicUrl(storagePath);

        const publicUrl = data?.publicUrl;

        if (!publicUrl) {
            throw new Error("Failed to generate public URL for large file");
        }

        console.log("Large file uploaded successfully:", publicUrl);

        return publicUrl;
    } catch (error: any) {
        console.error("Large file upload failed:", error);
        throw error;
    }
};
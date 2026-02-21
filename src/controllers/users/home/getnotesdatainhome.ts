// controllers/users/home/getnotesdata.controller.ts

import { Request, Response } from "express";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import NotesUpload from "../../../models/users/NotesUpload";
// import fetch from "node-fetch";
import axios from "axios";
import purchaseModel from "../../../models/payments/purchase.model";

//  NEW: Controller to fetch all approved notes for the Home Screen
export const getAllNotes = async (req: Request, res: Response) => {
    try {
        const {
            fileType,
            sort,
            search,
            page = "1",
            limit = "10",
        } = req.query;

        const pageNum = Math.max(parseInt(page as string), 1);
        const limitNum = Math.min(parseInt(limit as string), 20);
        const skip = (pageNum - 1) * limitNum;

        /* ===============================
           BASE QUERY
        =============================== */
        const query: any = { status: "approved" };

        if (fileType) {
            query.fileType = fileType;
        }

        /* ===============================
           SEARCH (TEXT + REGEX SAFE)
        =============================== */
        if (search) {
            const searchRegex = new RegExp(search as string, "i");

            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { subject: searchRegex },
                { course: searchRegex },
            ];
        }

        let notesQuery = NotesUpload.find(query)
            .populate("uploadedBy", "fullName avatar")
            .select(
                "title description subject course semester fileType price pages thumbnail rating uploadedBy createdAt"
            )
            .skip(skip)
            .limit(limitNum)
            .lean();

        /* ===============================
           SORTING
        =============================== */
        if (sort === "rating") {
            notesQuery = notesQuery.sort({ rating: -1 });
        } else {
            notesQuery = notesQuery.sort({ createdAt: -1 });
        }

        const [notes, total] = await Promise.all([
            notesQuery,
            NotesUpload.countDocuments(query),
        ]);

        const formattedNotes = notes.map((note: any) => ({
            id: note._id.toString(),

            title: note.title,
            description: note.description,

            course: note.course,
            subject: note.subject,
            semester: note.semester || "N/A",

            fileType: note.fileType,
            price: note.price,
            isLocked: true,

            thumbnail: note.thumbnail,
            pages: note.pages ?? 1,

            author: note.uploadedBy?.fullName || "Unknown",
            authorAvatar: note.uploadedBy?.avatar || null,

            rating: note.rating ?? 0,
            createdAt: note.createdAt,
        }));

        return res.status(200).json({
            success: true,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
            },
            data: formattedNotes,
        });
    } catch (error) {
        console.error("GET NOTES ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

//  EXISTING: Your Preview logic

interface AuthRequest extends Request {
    user?: { _id: string };
}

export const getNotePreview = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id; // auth middleware must set this

        const note = await NotesUpload.findById(id)
            .select("file status title")
            .lean();

        if (!note || note.status !== "approved" || !note.file) {
            return res.status(404).json({
                success: false,
                message: "Invalid or missing note",
            });
        }

        /* ================= CHECK PURCHASE ================= */
        const isPurchased = await purchaseModel.exists({ userId, noteId: id });

        /* ======================================================
           1️ CHECK FILE SIZE FIRST (VERY IMPORTANT)
        ====================================================== */
        const head = await axios.head(note.file);
        const fileSize = Number(head.headers["content-length"] || 0);

        const MAX_ALLOWED_SIZE = 30 * 1024 * 1024;

        if (!fileSize || fileSize > MAX_ALLOWED_SIZE) {
            return res.status(413).json({
                success: false,
                message: "Preview not available for large PDF files",
            });
        }

        /* ======================================================
           2️ DOWNLOAD PDF
        ====================================================== */
        const pdfResponse = await axios.get(note.file, {
            responseType: "arraybuffer",
            timeout: 15000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: (s) => s === 200,
        });

        /* ================= IF PURCHASED: RETURN FULL PDF ================= */
        if (isPurchased) {
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", 'inline; filename="full.pdf"');
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("Content-Length", pdfResponse.data.byteLength);
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("ngrok-skip-browser-warning", "true");

            return res.status(200).send(Buffer.from(pdfResponse.data));
        }

        /* ================= PREVIEW MODE (NOT PURCHASED) ================= */

        const originalPdf = await PDFDocument.load(pdfResponse.data);
        const totalPages = originalPdf.getPageCount();

        if (totalPages <= 1) {
            return res.status(403).json({
                success: false,
                message: "Preview not available for this document",
            });
        }

        const MAX_PREVIEW_PAGES = 10;

        const previewPageCount = Math.min(
            MAX_PREVIEW_PAGES,
            totalPages - 1
        );

        const previewPdf = await PDFDocument.create();

        const pages = await previewPdf.copyPages(
            originalPdf,
            Array.from({ length: previewPageCount }, (_, i) => i)
        );

        pages.forEach((page) => previewPdf.addPage(page));

        previewPdf.getPages().forEach((page) => {
            const { width, height } = page.getSize();
            page.drawText("Studenote • Preview Only", {
                x: width * 0.15,
                y: height * 0.45,
                size: 34,
                rotate: degrees(45),
                color: rgb(0.85, 0.85, 0.85),
                opacity: 0.35,
            });
        });

        const previewBytes = await previewPdf.save();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'inline; filename="preview.pdf"');
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Length", previewBytes.length);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("ngrok-skip-browser-warning", "true");

        res.setHeader("X-Preview-Pages", previewPageCount.toString());
        res.setHeader("X-Total-Pages", totalPages.toString());

        return res.status(200).send(Buffer.from(previewBytes));
    } catch (error) {
        console.error("PDF PREVIEW ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Preview failed",
        });
    }
};
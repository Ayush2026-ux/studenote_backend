import { Router } from "express";
import {
    getPostInfo,
    approveNote,
    rejectNote,
    getNoteDetails,
    getModerationStats,
    bulkApproveNotes,
    bulkRejectNotes,
} from "../../controllers/admin/moderation/getPostInfo";
import { adminAuth } from "../../middlewares/adminAuth.middleware";

const router = Router();

/* =========================================================
   GET ENDPOINTS
========================================================= */

// Get all pending/rejected/approved notes with pagination
router.get("/notes", adminAuth, getPostInfo);

// Get specific note details
router.get("/notes/:noteId", adminAuth, getNoteDetails);

// Get moderation statistics
router.get("/stats", adminAuth, getModerationStats);

/* =========================================================
   POST/PUT ENDPOINTS
========================================================= */

// Approve a single note
router.put("/notes/:noteId/approve", adminAuth, approveNote);

// Reject a single note with reason
router.put("/notes/:noteId/reject", adminAuth, rejectNote);

// Bulk approve notes
router.post("/notes/bulk/approve", adminAuth, bulkApproveNotes);

// Bulk reject notes
router.post("/notes/bulk/reject", adminAuth, bulkRejectNotes);

export default router;

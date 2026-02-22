import { Request, Response } from "express";
import NoteUploads, { INote, COURSE_IDS, SEMESTERS, FILE_TYPES } from "../../../models/users/NotesUpload";
import { sendNoteRejectionEmail } from "../../../services/mail/noteRejection.mail";
import { sendNoteApprovalEmail } from "../../../services/mail/noteApproval.mail";
import { getS3SignedDownloadUrl } from "../../../services/users/uploadnots.services";

//  ADMIN NOTE RESPONSE (For List/Moderation View)
interface AdminNote {
    id: string;
    title: string;
    description: string;
    creator: string;
    creatorEmail: string;
    subject: string;
    course: typeof COURSE_IDS[number];
    semester: typeof SEMESTERS[number];
    fileType: typeof FILE_TYPES[number];
    pages: number;
    university?: string;
    status: "pending" | "approved" | "rejected";
    reviewMessage?: string;
    uploadDate: string;
    price: number;
    views: number;
    shareCount: number;
    likes: number;
    commentsCount: number;
    downloads: number;
    thumbnail: string;
    file: string;
}

//  ADMIN NOTE DETAIL (Full Details)
interface AdminNoteDetail extends AdminNote {
    uploadedById: string;
    createdAt: string;
    updatedAt: string;
}

//  ADMIN RESPONSE WRAPPER
interface AdminResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

/* 
   GET ALL PENDING NOTES FOR MODERATION
*/

export const getPostInfo = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { status = "pending", page = 1, limit = 10 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        // Fetch notes based on status with feed data
        const notes = await NoteUploads.find({
            status: status || "pending",
        })
            .populate("uploadedBy", "fullName email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        // Get total count
        const total = await NoteUploads.countDocuments({
            status: status || "pending",
        });

        // Import Feed model for stats
        const feedModels = require("../../../models/users/feed.models").default;

        //Format response with SIGNED URLs
        const formattedNotes: AdminNote[] = await Promise.all(
            notes.map(async (note: INote) => {
                const feedData = await feedModels.findOne({ note: note._id });

                // generate signed URLs
                const thumbnailUrl = note.thumbnail
                    ? await getS3SignedDownloadUrl(note.thumbnail, 60 * 60) // 1 hour
                    : null;

                const fileUrl = note.file
                    ? await getS3SignedDownloadUrl(note.file, 60 * 10) // 10 minutes
                    : null;

                return {
                    id: note._id.toString(),
                    title: note.title,
                    description: note.description,
                    creator: (note.uploadedBy as any)?.fullName || "Unknown",
                    creatorEmail: (note.uploadedBy as any)?.email || "unknown@example.com",
                    subject: note.subject,
                    course: note.course,
                    semester: note.semester,
                    fileType: note.fileType,
                    pages: note.pages || 0,
                    university: note.university,
                    status: note.status,
                    reviewMessage: note.reviewMessage,
                    uploadDate: new Date(note.createdAt).toISOString().split("T")[0],
                    price: note.price,
                    views: feedData?.views || 0,
                    downloads: note.downloads,
                    shareCount: feedData?.shareCount || 0,
                    likes: feedData?.likes || 0,
                    commentsCount: feedData?.commentsCount || 0,

                    // ✅ Admin PDF will now open
                    thumbnail: thumbnailUrl as any,
                    file: fileUrl as any,
                };
            })
        );

        const response: AdminResponse<{
            notes: AdminNote[];
            total: number;
            page: number;
            limit: number;
        }> = {
            success: true,
            message: "Notes retrieved successfully",
            data: {
                notes: formattedNotes,
                total,
                page: Number(page),
                limit: Number(limit),
            },
        };

        res.status(200).json(response);
    } catch (error: any) {
        console.error("Error fetching notes:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notes",
            error: error.message,
        });
    }
};
/* 
   APPROVE NOTE
 */

export const approveNote = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { noteId } = req.params;

        const note = await NoteUploads.findByIdAndUpdate(
            noteId,
            { status: "approved" },
            { new: true }
        ).populate("uploadedBy", "fullName email");

        if (!note) {
            res.status(404).json({
                success: false,
                message: "Note not found",
            });
            return;
        }

        //  Send approval email to user
        try {
            await sendNoteApprovalEmail({
                userEmail: (note.uploadedBy as any)?.email,
                userName: (note.uploadedBy as any)?.fullName,
                noteTitle: note.title,
            });
        } catch (emailError) {
            console.error(" Email send failed, but note approved:", emailError);
            // Continue even if email fails
        }

        const response: AdminResponse<any> = {
            success: true,
            message: "Note approved successfully and email sent to user",
            data: {
                id: note._id,
                title: note.title,
                status: note.status,
                creator: note.uploadedBy._id,
                emailSent: true,
            },
        };

        res.status(200).json(response);
    } catch (error: any) {
        console.error("Error approving note:", error);
        res.status(500).json({
            success: false,
            message: "Failed to approve note",
            error: error.message,
        });
    }
};

/* 
   REJECT NOTE
 */

export const rejectNote = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { noteId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            res.status(400).json({
                success: false,
                message: "Rejection reason is required",
            });
            return;
        }

        const note = await NoteUploads.findByIdAndUpdate(
            noteId,
            { status: "rejected", reviewMessage: reason },
            { new: true }
        ).populate("uploadedBy", "fullName email");

        if (!note) {
            res.status(404).json({
                success: false,
                message: "Note not found",
            });
            return;
        }

        //  Send rejection email to user
        try {
            await sendNoteRejectionEmail({
                userEmail: (note.uploadedBy as any)?.email,
                userName: (note.uploadedBy as any)?.fullName,
                noteTitle: note.title,
                rejectionReason: reason,
            });
        } catch (emailError) {
            console.error(" Email send failed, but note rejected:", emailError);
            // Continue even if email fails
        }

        const response: AdminResponse<any> = {
            success: true,
            message: "Note rejected successfully and email sent to user",
            data: {
                id: note._id,
                title: note.title,
                status: note.status,
                creator: note.uploadedBy._id,
                reason,
                emailSent: true,
            },
        };

        res.status(200).json(response);
    } catch (error: any) {
        console.error("Error rejecting note:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reject note",
            error: error.message,
        });
    }
};

/* 
   GET NOTE DETAILS
 */

export const getNoteDetails = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { noteId } = req.params;

        const note = await NoteUploads.findById(noteId).populate(
            "uploadedBy",
            "fullName email mobile"
        );

        if (!note) {
            res.status(404).json({
                success: false,
                message: "Note not found",
            });
            return;
        }

        // Import Feed model for stats
        const feedModels = require("../../../models/users/feed.models").default;
        const feedData = await feedModels.findOne({ note: noteId });

        const noteDetail: AdminNoteDetail = {
            id: note._id.toString(),
            title: note.title,
            description: note.description,
            creator: (note.uploadedBy as any)?.fullName || "Unknown",
            creatorEmail: (note.uploadedBy as any)?.email || "unknown@example.com",
            subject: note.subject,
            course: note.course,
            semester: note.semester,
            fileType: note.fileType,
            pages: note.pages || 0,
            university: note.university,
            status: note.status,
            reviewMessage: note.reviewMessage,
            uploadDate: new Date(note.createdAt).toISOString().split("T")[0],
            price: note.price,
            views: feedData?.views || 0,
            downloads: note.downloads,
            thumbnail: note.thumbnail,
            file: note.file,
            shareCount: feedData?.shareCount || 0,
            likes: feedData?.likes || 0,
            commentsCount: feedData?.commentsCount || 0,
            uploadedById: note.uploadedBy._id.toString(),
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
        };

        console.log("Fetched note details:", noteDetail);

        res.status(200).json({
            success: true,
            message: "Note details fetched",
            data: noteDetail,
        });
    } catch (error: any) {
        console.error("Error fetching note details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch note details",
            error: error.message,
        });
    }
};

/* 
   GET MODERATION STATISTICS
 */

export const getModerationStats = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const pending = await NoteUploads.countDocuments({ status: "pending" });
        const approved = await NoteUploads.countDocuments({ status: "approved" });
        const rejected = await NoteUploads.countDocuments({ status: "rejected" });
        const total = await NoteUploads.countDocuments();

        res.status(200).json({
            success: true,
            message: "Statistics fetched",
            data: {
                pending,
                approved,
                rejected,
                total,
                approvalRate: total > 0 ? ((approved / total) * 100).toFixed(2) : 0,
            },
        });
    } catch (error: any) {
        console.error("Error fetching stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch statistics",
            error: error.message,
        });
    }
};

/* 

   BULK ACTIONS
*/

export const bulkApproveNotes = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { noteIds } = req.body;

        if (!Array.isArray(noteIds) || noteIds.length === 0) {
            res.status(400).json({
                success: false,
                message: "noteIds array is required",
            });
            return;
        }

        const result = await NoteUploads.updateMany(
            { _id: { $in: noteIds } },
            { status: "approved" }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} notes approved successfully`,
            data: {
                modifiedCount: result.modifiedCount,
            },
        });
    } catch (error: any) {
        console.error("Error bulk approving:", error);
        res.status(500).json({
            success: false,
            message: "Failed to bulk approve notes",
            error: error.message,
        });
    }
};

export const bulkRejectNotes = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { noteIds, reason } = req.body;

        if (!Array.isArray(noteIds) || noteIds.length === 0) {
            res.status(400).json({
                success: false,
                message: "noteIds array is required",
            });
            return;
        }

        const result = await NoteUploads.updateMany(
            { _id: { $in: noteIds } },
            { status: "rejected", reviewMessage: reason || "Rejected by admin" }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} notes rejected successfully`,
            data: {
                modifiedCount: result.modifiedCount,
            },
        });
    } catch (error: any) {
        console.error("Error bulk rejecting:", error);
        res.status(500).json({
            success: false,
            message: "Failed to bulk reject notes",
            error: error.message,
        });
    }
};

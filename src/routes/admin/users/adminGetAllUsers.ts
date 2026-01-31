import express from "express";
import { getAllUsers } from "../../../controllers/admin/users/getUserData";
import { adminAuth } from "../../../middlewares/adminAuth.middleware";

const router = express.Router();

// GET /api/admin/users?page=1&limit=10
router.get("/", adminAuth, getAllUsers);

export default router;

import { Router } from "express";
import { authGuard } from "../../middlewares/auth.middleware";
import { getWallet, withdrawWallet, } from "../../controllers/users/payments/wallet.controller";


const router = Router();

router.get("/", authGuard, getWallet as any);
router.post("/withdraw", authGuard, withdrawWallet as any);

export default router;

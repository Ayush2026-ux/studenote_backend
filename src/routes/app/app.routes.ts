// routes/app.routes.ts

import { Router, Request, Response } from "express";

const router = Router();

router.get("/version", (_req: Request, res: Response) => {
  return res.json({
  latestVersion: "1.1.0",
  minVersion: "1.0.0",
  forceUpdate: false, 
  updateUrl: "https://t.me/EasystudyZ",
});
});

export default router;
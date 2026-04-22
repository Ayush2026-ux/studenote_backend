import { Router, Request, Response } from "express";

const router = Router();

/**
 * 📱 App Version Controller
 * Used by mobile app to check for updates
 */
router.get("/version", (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,

      // 🔥 Latest version available on server
      latestVersion: "1.1.0",

      // 🔥 Minimum version required (force update below this)
      minVersion: "1.0.0",

      // 🔥 Force update (true = user cannot skip)
      forceUpdate: false,

      // 🔥 Where to download update (Telegram / Website)
      updateUrl: "https://t.me/EasystudyZ",

      // 🔥 Optional message (frontend me show kar sakte ho)
      message: "🚀 New update available with improvements & bug fixes!",
    });
  } catch (error) {
    console.error("Version route error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch app version",
    });
  }
});

export default router;
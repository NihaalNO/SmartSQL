import { Router } from "express";

const router = Router();

// GET /health
router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "SmartSQL API" });
});

export default router;

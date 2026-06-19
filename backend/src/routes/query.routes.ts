import { Router } from "express";
import * as QueryController from "../controllers/query.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middlewares/validation.middleware";
import { authenticate, requireRole } from "../middlewares/auth.middleware";
import { queryLimiter } from "../middlewares/rateLimit.middleware";
import * as schema from "../validators/query.validator";

const router = Router();

// All query routes require authentication
router.use(authenticate);

// POST /api/queries/run — admin, analyst, viewer all can run
router.post(
  "/run",
  queryLimiter,
  requireRole("admin", "analyst", "viewer"),
  validateBody(schema.queryRequestSchema),
  asyncHandler(QueryController.runQuery)
);

// POST /api/queries/test-connection — admin, analyst only
router.post(
  "/test-connection",
  queryLimiter,
  requireRole("admin", "analyst"),
  validateBody(schema.testConnectionSchema),
  asyncHandler(QueryController.testConnection)
);

// POST /api/queries/run-live — admin, analyst only
router.post(
  "/run-live",
  queryLimiter,
  requireRole("admin", "analyst"),
  validateBody(schema.liveQueryRequestSchema),
  asyncHandler(QueryController.runLiveQuery)
);

// POST /api/queries/save — admin, analyst only
router.post(
  "/save",
  validateBody(schema.saveQuerySchema),
  requireRole("admin", "analyst"),
  asyncHandler(QueryController.saveQuery)
);

// GET /api/queries/saved — admin, analyst only
router.get(
  "/saved",
  requireRole("admin", "analyst"),
  asyncHandler(QueryController.listSaved)
);

// DELETE /api/queries/saved/:savedId — admin, analyst only
router.delete(
  "/saved/:savedId",
  requireRole("admin", "analyst"),
  asyncHandler(QueryController.deleteSaved)
);

// GET /api/queries/history — any authenticated user
router.get("/history", asyncHandler(QueryController.queryHistory));

// POST /api/queries/feedback — any authenticated user
router.post(
  "/feedback",
  validateBody(schema.feedbackSchema),
  asyncHandler(QueryController.submitFeedback)
);

export default router;

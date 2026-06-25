import { Router } from "express";
import * as QueryController from "../controllers/query.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middlewares/validation.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { queryLimiter } from "../middlewares/rateLimit.middleware";
import * as schema from "../validators/query.validator";

const router = Router();

// All query routes require authentication
router.use(authenticate);

router.post(
  "/run",
  queryLimiter,
  validateBody(schema.queryRequestSchema),
  asyncHandler(QueryController.runQuery)
);

router.post(
  "/test-connection",
  queryLimiter,
  validateBody(schema.testConnectionSchema),
  asyncHandler(QueryController.testConnection)
);

router.post(
  "/run-live",
  queryLimiter,
  validateBody(schema.liveQueryRequestSchema),
  asyncHandler(QueryController.runLiveQuery)
);

router.post(
  "/save",
  validateBody(schema.saveQuerySchema),
  asyncHandler(QueryController.saveQuery)
);

router.get(
  "/saved",
  asyncHandler(QueryController.listSaved)
);

router.delete(
  "/saved/:savedId",
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

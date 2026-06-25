import { Router } from "express";
import { z } from "zod";
import * as SchemaController from "../controllers/schema.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import * as schema from "../validators/schema.validator";

const router = Router();

// All schema routes require authentication
router.use(authenticate);

// GET /api/schema/internal
router.get("/internal", asyncHandler(SchemaController.internalSchema));

// GET /api/schema/internal/tables
router.get("/internal/tables", asyncHandler(SchemaController.internalTables));

// GET /api/schema/internal/visualize — rich schema for visualizer
router.get("/internal/visualize", asyncHandler(SchemaController.internalVisualize));

// POST /api/schema/external/visualize — rich schema for live DB visualizer
router.post(
  "/external/visualize",
  validateBody(schema.externalVisualizeSchema),
  asyncHandler(SchemaController.externalVisualize)
);

// POST /api/schema/external/analyze — full schema + AI analysis + docs
router.post(
  "/external/analyze",
  validateBody(schema.externalVisualizeSchema.extend({
    model_provider: z.string().optional(),
    model_name: z.string().optional(),
  })),
  asyncHandler(SchemaController.analyzeExternalSchema)
);

export default router;

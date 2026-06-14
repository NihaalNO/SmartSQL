import { Router } from "express";
import * as SchemaController from "../controllers/schema.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All schema routes require authentication
router.use(authenticate);

// GET /api/schema/internal
router.get("/internal", asyncHandler(SchemaController.internalSchema));

// GET /api/schema/internal/tables
router.get("/internal/tables", asyncHandler(SchemaController.internalTables));

export default router;

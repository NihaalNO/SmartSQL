import { Router } from "express";
import * as LiveDbController from "../controllers/liveDb.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { queryLimiter } from "../middlewares/rateLimit.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import * as schema from "../validators/liveDb.validator";

const router = Router();

router.use(authenticate);

router.post("/test", queryLimiter, validateBody(schema.liveDbTestSchema), asyncHandler(LiveDbController.testConnection));
router.post("/schema", queryLimiter, validateBody(schema.liveDbBaseSchema), asyncHandler(LiveDbController.schema));
router.post("/query", queryLimiter, validateBody(schema.liveDbQuerySchema), asyncHandler(LiveDbController.runQuery));
router.post("/stats", queryLimiter, validateBody(schema.liveDbBaseSchema), asyncHandler(LiveDbController.stats));
router.post("/sample-rows", queryLimiter, validateBody(schema.liveDbSampleRowsSchema), asyncHandler(LiveDbController.sampleRows));

export default router;

import { Router } from "express";
import * as AuthController from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middlewares/validation.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { authLimiter } from "../middlewares/rateLimit.middleware";
import * as schema from "../validators/auth.validator";

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  authLimiter,
  validateBody(schema.registerSchema),
  asyncHandler(AuthController.register)
);

// POST /api/auth/login
router.post(
  "/login",
  authLimiter,
  validateBody(schema.loginSchema),
  asyncHandler(AuthController.login)
);

// POST /api/auth/admin-login
router.post(
  "/admin-login",
  authLimiter,
  validateBody(schema.adminLoginSchema),
  asyncHandler(AuthController.adminLogin)
);

// POST /api/auth/token (OAuth2 form)
router.post(
  "/token",
  authLimiter,
  validateBody(schema.tokenFormSchema),
  asyncHandler(AuthController.tokenForm)
);

// GET /api/auth/me
router.get("/me", authenticate, asyncHandler(async (req, res) => AuthController.me(req, res)));

export default router;

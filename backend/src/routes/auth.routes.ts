import { Router } from "express";
import * as AuthController from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middlewares/validation.middleware";
import { validateQuery } from "../middlewares/validation.middleware";
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

// POST /api/auth/login/google (Google OAuth callback)
router.post(
  "/login/google",
  authLimiter,
  validateBody(schema.googleLoginSchema),
  asyncHandler(AuthController.loginWithGoogle)
);

// POST /api/auth/token (OAuth2 form)
router.post(
  "/token",
  authLimiter,
  validateBody(schema.tokenFormSchema),
  asyncHandler(AuthController.tokenForm)
);

// GET /api/auth/verify-email
router.get(
  "/verify-email",
  validateQuery(schema.verifyEmailSchema),
  asyncHandler(AuthController.verifyEmail)
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  authLimiter,
  validateBody(schema.forgotPasswordSchema),
  asyncHandler(AuthController.forgotPassword)
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  authLimiter,
  validateBody(schema.resetPasswordSchema),
  asyncHandler(AuthController.resetPassword)
);

// GET /api/auth/me
router.get("/me", authenticate, asyncHandler(AuthController.me));

  // POST /api/auth/resend-verification-email
  router.post(
    "/resend-verification-email",
    authLimiter,
    authenticate,
    asyncHandler(AuthController.resendVerificationEmail)
  );

export default router;
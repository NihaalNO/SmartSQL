import { Router } from "express";
import * as AdminController from "../controllers/admin.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, requireRole } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import * as schema from "../validators/schema.validator";

const router = Router();

// All admin routes require admin role
router.use(authenticate, requireRole("admin"));

// GET /api/admin/stats
router.get("/stats", asyncHandler(AdminController.platformStats));

// GET /api/admin/users
router.get("/users", asyncHandler(AdminController.listUsersController));

// PATCH /api/admin/users/:userId/status
router.patch(
  "/users/:userId/status",
  validateBody(schema.userStatusUpdateSchema),
  asyncHandler(AdminController.updateUserStatusController)
);

// PATCH /api/admin/users/:userId/role
router.patch(
  "/users/:userId/role",
  validateBody(schema.userRoleUpdateSchema),
  asyncHandler(AdminController.updateUserRoleController)
);

// DELETE /api/admin/users/:userId
router.delete(
  "/users/:userId",
  asyncHandler(AdminController.deleteUserController)
);

// GET /api/admin/logs
router.get("/logs", asyncHandler(AdminController.allQueryLogs));

export default router;

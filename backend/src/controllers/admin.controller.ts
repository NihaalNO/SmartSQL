import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import {
  getPlatformStats,
  listUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getAllQueryLogs,
} from "../services/admin.service";

// ---------------------------------------------------------------------------
// Platform stats
// ---------------------------------------------------------------------------

export async function platformStats(_req: Request, res: Response): Promise<void> {
  const stats = await getPlatformStats();
  res.json(stats);
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export async function listUsersController(_req: Request, res: Response): Promise<void> {
  const users = await listUsers();
  res.json(users);
}

export async function updateUserStatusController(
  req: Request,
  res: Response
): Promise<void> {
  const userId = parseInt(req.params.userId, 10);
  const { status } = req.body as { status: string };

  if (!["active", "inactive"].includes(status)) {
    throw ApiError.badRequest("status must be 'active' or 'inactive'");
  }

  const message = await updateUserStatus(userId, status);
  res.json({ message });
}

export async function updateUserRoleController(
  req: Request,
  res: Response
): Promise<void> {
  const userId = parseInt(req.params.userId, 10);
  const { role_name } = req.body as { role_name: string };

  const allowed = ["analyst", "viewer"];
  if (!allowed.includes(role_name)) {
    throw ApiError.badRequest(`role_name must be one of ${allowed.join(", ")}`);
  }

  const message = await updateUserRole(userId, role_name);
  res.json({ message });
}

export async function deleteUserController(
  req: Request,
  res: Response
): Promise<void> {
  const userId = parseInt(req.params.userId, 10);
  const message = await deleteUser(userId);
  res.json({ message });
}

// ---------------------------------------------------------------------------
// Query logs (all users)
// ---------------------------------------------------------------------------

export async function allQueryLogs(req: Request, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const logs = await getAllQueryLogs(limit);
  res.json(logs);
}

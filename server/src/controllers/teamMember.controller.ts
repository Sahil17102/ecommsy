import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import {
  listTeamMembers,
  createTeamMember,
  deleteTeamMember,
  toggleTeamMemberActive,
  TeamMemberError,
} from "../services/teamMember.js";
import { generateAndSetTempPassword } from "../services/auth.js";
import { UserRole } from "../models/User.js";

/**
 * Resolves the effective owner id from a request. Returns 403 if the request
 * is from a team member (members cannot manage other members).
 *
 * Returns null on error after writing the response.
 */
async function resolveOwnerOrFail(req: Request, res: Response): Promise<string | null> {
  const ownerId = req.userId; // already the parent's id for members
  const actorId = req.actorId ?? req.userId;
  if (!ownerId || !actorId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  // If actorId !== ownerId then the actor is a team member — block writes.
  if (actorId !== ownerId && req.method !== "GET") {
    res.status(403).json({ error: "Only the account owner can manage team members" });
    return null;
  }
  return ownerId;
}

// ── Seller panel handlers ──

export async function handleListMyTeamMembers(req: Request, res: Response) {
  const ownerId = req.userId;
  if (!ownerId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const members = await listTeamMembers(ownerId);
  res.json({ members });
}

export async function handleCreateMyTeamMember(req: Request, res: Response) {
  const ownerId = await resolveOwnerOrFail(req, res);
  if (!ownerId) return;
  const member = await createTeamMember(ownerId, req.body);
  res.status(201).json({ member });
}

export async function handleDeleteMyTeamMember(req: Request, res: Response) {
  const ownerId = await resolveOwnerOrFail(req, res);
  if (!ownerId) return;
  await deleteTeamMember(ownerId, req.params.memberId);
  res.json({ message: "Team member removed" });
}

export async function handleToggleMyTeamMemberActive(req: Request, res: Response) {
  const ownerId = await resolveOwnerOrFail(req, res);
  if (!ownerId) return;
  const member = await toggleTeamMemberActive(ownerId, req.params.memberId);
  res.json({ member });
}

/**
 * Owner resets a team member's password — generates a temp password and
 * returns it once.
 */
export async function handleResetMyTeamMemberPassword(req: Request, res: Response) {
  const ownerId = await resolveOwnerOrFail(req, res);
  if (!ownerId) return;

  const memberId = req.params.memberId;
  const member = await db.query.users.findFirst({ where: eq(users.id, memberId) });
  if (!member || !member.parentUserId || member.parentUserId !== ownerId) {
    throw new TeamMemberError(404, "Team member not found");
  }

  const tempPassword = await generateAndSetTempPassword(memberId);
  res.json({
    message: "Password reset. Share the temporary password with the team member.",
    tempPassword,
    resetBy: "owner",
  });
}

// ── Admin panel handlers (mounted under /admin/users/:id) ──

export async function handleAdminListTeamMembers(req: Request, res: Response) {
  const ownerId = req.params.id;
  // Make sure the target is itself an owner — admins can only view team members
  // attached to a top-level seller account.
  const target = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.parentUserId) {
    res.status(400).json({ error: "Selected user is itself a team member, not an owner" });
    return;
  }
  const members = await listTeamMembers(ownerId);
  res.json({ members });
}

export async function handleAdminCreateTeamMember(req: Request, res: Response) {
  const ownerId = req.params.id;
  const member = await createTeamMember(ownerId, req.body);
  res.status(201).json({ member });
}

export async function handleAdminDeleteTeamMember(req: Request, res: Response) {
  const { id: ownerId, memberId } = req.params;
  await deleteTeamMember(ownerId, memberId);
  res.json({ message: "Team member removed" });
}

/**
 * Admin resets the password of a seller (or any user). Returns the temp
 * password once for the admin to relay (later: send via email).
 */
export async function handleAdminResetUserPassword(req: Request, res: Response) {
  const targetId = req.params.id;
  // Resolve to the owner for scope check (could be a team member id)
  const target = await db.query.users.findFirst({
    where: eq(users.id, targetId),
    columns: { parentUserId: true, role: true },
  });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // Admin/superadmin passwords can never be reset through the seller flow.
  // Superadmins must contact support; admins are reset via the team-members area.
  if (target.role === UserRole.SUPERADMIN || target.role === UserRole.ADMIN) {
    res.status(403).json({
      error:
        target.role === UserRole.SUPERADMIN
          ? "Superadmin passwords cannot be reset from the admin panel. Please contact support."
          : "Admin passwords must be reset from the Team Members area, not the seller list.",
    });
    return;
  }
  const tempPassword = await generateAndSetTempPassword(targetId);
  res.json({
    message: "Password reset. Share the temporary password with the user.",
    tempPassword,
    resetBy: "admin",
  });
}

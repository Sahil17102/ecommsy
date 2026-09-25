import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import type { IUser } from "../models/User.js";
import { UserRole, TeamRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword } from "./auth.js";
import logger from "../config/logger.js";

export class TeamMemberError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "TeamMemberError";
  }
}

export interface TeamMemberDto {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  teamRole: TeamRole;
  parentUserId: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDto(doc: IUser): TeamMemberDto {
  return {
    id: doc.id,
    name: doc.name ?? null,
    firstName: doc.firstName ?? null,
    lastName: doc.lastName ?? null,
    email: doc.email ?? null,
    phone: doc.phone ?? null,
    teamRole: (doc.teamRole as TeamRole | null | undefined) ?? TeamRole.MEMBER,
    parentUserId: doc.parentUserId ?? null,
    isActive: doc.isActive ?? true,
    lastLogin: doc.lastLogin ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateTeamMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

/**
 * Lists all team members under the given owner. The owner is *not* included
 * in the result — only sub-accounts.
 */
export async function listTeamMembers(ownerId: string): Promise<TeamMemberDto[]> {
  const docs = await db
    .select()
    .from(users)
    .where(eq(users.parentUserId, ownerId))
    .orderBy(desc(users.createdAt));
  return docs.map(toDto);
}

/**
 * Creates a new team member under `ownerId`. The new user inherits role:user
 * and gets `parentUserId = ownerId`, `teamRole = "member"`.
 *
 * Throws 409 if the email/phone already belongs to another user.
 */
export async function createTeamMember(
  ownerId: string,
  input: CreateTeamMemberInput,
): Promise<TeamMemberDto> {
  // Verify the owner exists and is itself an owner (not a member)
  const owner = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
  if (!owner) throw new TeamMemberError(404, "Owner account not found");
  if (owner.parentUserId) {
    throw new TeamMemberError(403, "Team members cannot create other team members");
  }

  const email = input.email.toLowerCase().trim();
  const phone = input.phone?.trim();

  const conflictClause = phone
    ? or(eq(users.email, email), eq(users.phone, phone))
    : eq(users.email, email);

  const conflict = await db.query.users.findFirst({ where: conflictClause });
  if (conflict) {
    throw new TeamMemberError(409, "A user with that email or phone already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const [member] = await db
    .insert(users)
    .values({
      email,
      phone: phone ?? null,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
      role: UserRole.USER,
      parentUserId: ownerId,
      teamRole: TeamRole.MEMBER,
      passwordHash,
      isVerified: true,
      onboardingComplete: true,
      isActive: true,
    })
    .returning();

  logger.info(`[TeamMember] Created member ${member.id} under owner ${ownerId}`);
  return toDto(member);
}

/**
 * Removes a team member. Caller must be the parent owner (or an admin acting
 * on behalf of the owner).
 */
export async function deleteTeamMember(
  ownerId: string,
  memberId: string,
): Promise<void> {
  const member = await db.query.users.findFirst({ where: eq(users.id, memberId) });
  if (!member) throw new TeamMemberError(404, "Team member not found");

  if (!member.parentUserId || member.parentUserId !== ownerId) {
    throw new TeamMemberError(403, "This user is not a member of the specified team");
  }

  await db.delete(users).where(eq(users.id, member.id));
  logger.info(`[TeamMember] Deleted member ${memberId} from owner ${ownerId}`);
}

/**
 * Toggles the isActive flag on a team member. Returns the updated DTO.
 */
export async function toggleTeamMemberActive(
  ownerId: string,
  memberId: string,
): Promise<TeamMemberDto> {
  const member = await db.query.users.findFirst({ where: eq(users.id, memberId) });
  if (!member) throw new TeamMemberError(404, "Team member not found");

  if (!member.parentUserId || member.parentUserId !== ownerId) {
    throw new TeamMemberError(403, "This user is not a member of the specified team");
  }

  const newActive = !member.isActive;
  const [updated] = await db
    .update(users)
    .set({ isActive: newActive, updatedAt: new Date() })
    .where(eq(users.id, member.id))
    .returning();

  logger.info(
    `[TeamMember] Toggled member ${memberId} isActive → ${updated.isActive} (owner ${ownerId})`,
  );
  return toDto(updated);
}

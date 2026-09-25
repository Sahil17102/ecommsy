/**
 * Was a Mongoose model — now just exports the role constants + the inferred
 * Drizzle row type so consumers (controllers, services, middleware) keep
 * working without import-path changes. The actual schema lives in
 * `../db/schema.ts`.
 */

import type { users } from "../db/schema.js";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPERADMIN = "superadmin",
}

export const USER_ROLES = Object.values(UserRole);
export const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPERADMIN];

export enum TeamRole {
  OWNER = "owner",
  MEMBER = "member",
}

export const TEAM_ROLES = Object.values(TeamRole);

/** Inferred row shape from the Drizzle users table. */
export type IUser = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * Transitional stub for `User` — the Mongoose model is gone. Any code that
 * still does `User.findById(...)` will throw at runtime with a clear message
 * pointing at the call site so it can be converted to Drizzle
 * (`db.query.users.findFirst(...)`).
 */
// Typed as `any` so existing Mongoose-shaped call sites (User.findById, etc.)
// type-check while still throwing a clear runtime error pointing at the
// conversion target. This is the transitional shim; tighten back to a typed
// repository once every call site is on Drizzle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const User: any = new Proxy({} as Record<string, never>, {
  get(_target, prop) {
    throw new Error(
      `models/User: Mongoose User model has been removed. Convert this call site to Drizzle ` +
      `(db.query.users / db.insert(users) / db.update(users) / db.delete(users)). ` +
      `Accessed property: ${String(prop)}`,
    );
  },
});

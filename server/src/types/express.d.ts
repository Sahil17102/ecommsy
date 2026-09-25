declare global {
  namespace Express {
    interface Request {
      /**
       * Effective scope user id — for team members this resolves to the parent
       * (owner) account so existing data queries continue to return the seller's
       * data without per-controller refactoring.
       */
      userId?: string;
      /**
       * The actual logged-in user id. For owners this equals `userId`; for team
       * members this is the member's own row id (used for self-operations like
       * change-password and /auth/me).
       */
      actorId?: string;
      userRole?: "user" | "admin" | "superadmin";
    }
  }
}

export {};

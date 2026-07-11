import type { MemberRole } from "@selfie-booth/database";

/**
 * Pure role-comparison logic, deliberately free of any request/database
 * dependency (unlike apps/web's `auth-server.ts`, which wraps this with
 * the actual session/Member lookup) so it can be unit tested in total
 * isolation and reused by any surface that needs a role check without
 * pulling in Next.js's request-scoped `headers()` or a live Prisma client.
 */
export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const ROLE_RANK: Record<MemberRole, number> = { VIEWER: 0, OPERATOR: 1, MANAGER: 2, ADMIN: 3, OWNER: 4 };

export function roleAtLeast(role: MemberRole, minimum: MemberRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function assertRoleAtLeast(role: MemberRole, minimum: MemberRole): void {
  if (!roleAtLeast(role, minimum)) {
    throw new AuthError("FORBIDDEN", `This action requires the ${minimum} role or higher.`);
  }
}

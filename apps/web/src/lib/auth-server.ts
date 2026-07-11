import "server-only";
import { headers } from "next/headers";
import { auth } from "@selfie-booth/auth";
import { prisma, type MemberRole } from "@selfie-booth/database";

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

export interface ActiveOrgContext {
  userId: string;
  organizationId: string;
  role: MemberRole;
}

/**
 * Resolves the caller's session AND their role in the currently-active
 * organization in one round trip. Every server action / route handler that
 * touches tenant data should go through this rather than trusting an
 * `organizationId` supplied by the client — it's derived solely from the
 * session's `activeOrganizationId` plus a `Member` row the user actually
 * owns, so cross-tenant access isn't reachable by passing a different id in
 * a request body.
 */
export async function requireActiveOrg(): Promise<ActiveOrgContext> {
  const session = await getServerSession();
  if (!session?.user) {
    throw new AuthError("UNAUTHENTICATED", "You must be signed in.");
  }

  const activeOrganizationId = session.session.activeOrganizationId;
  if (!activeOrganizationId) {
    throw new AuthError("NO_ACTIVE_ORG", "No active organization selected.");
  }

  const member = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: activeOrganizationId, userId: session.user.id } },
  });
  if (!member) {
    throw new AuthError("FORBIDDEN", "You are not a member of this organization.");
  }

  return { userId: session.user.id, organizationId: activeOrganizationId, role: member.role as MemberRole };
}

const ROLE_RANK: Record<MemberRole, number> = { VIEWER: 0, OPERATOR: 1, MANAGER: 2, ADMIN: 3, OWNER: 4 };

export function assertRoleAtLeast(role: MemberRole, minimum: MemberRole): void {
  if (ROLE_RANK[role] < ROLE_RANK[minimum]) {
    throw new AuthError("FORBIDDEN", `This action requires the ${minimum} role or higher.`);
  }
}

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

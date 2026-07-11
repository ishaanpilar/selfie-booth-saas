import { createAccessControl } from "better-auth/plugins/access";

/**
 * Central permission matrix for the organization plugin. Every resource an
 * authenticated actor can touch is listed here with its allowed actions;
 * roles below are just named subsets. Keep this in sync with the
 * `MemberRole` enum in packages/database/prisma/schema.prisma.
 */
export const statement = {
  event: ["create", "read", "update", "delete", "publish"],
  booth: ["create", "read", "update", "delete", "assign"],
  template: ["create", "read", "update", "delete"],
  printer: ["create", "read", "update", "delete"],
  printJob: ["create", "read", "cancel", "retry"],
  member: ["invite", "read", "update", "remove"],
  analytics: ["read", "export"],
  organization: ["update", "delete", "billing"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  event: ["create", "read", "update", "delete", "publish"],
  booth: ["create", "read", "update", "delete", "assign"],
  template: ["create", "read", "update", "delete"],
  printer: ["create", "read", "update", "delete"],
  printJob: ["create", "read", "cancel", "retry"],
  member: ["invite", "read", "update", "remove"],
  analytics: ["read", "export"],
  organization: ["update", "delete", "billing"],
});

export const admin = ac.newRole({
  event: ["create", "read", "update", "delete", "publish"],
  booth: ["create", "read", "update", "delete", "assign"],
  template: ["create", "read", "update", "delete"],
  printer: ["create", "read", "update", "delete"],
  printJob: ["create", "read", "cancel", "retry"],
  member: ["invite", "read", "update", "remove"],
  analytics: ["read", "export"],
  organization: ["update"],
});

export const manager = ac.newRole({
  event: ["create", "read", "update", "publish"],
  booth: ["create", "read", "update", "assign"],
  template: ["create", "read", "update"],
  printer: ["read", "update"],
  printJob: ["create", "read", "cancel", "retry"],
  member: ["read"],
  analytics: ["read", "export"],
  organization: [],
});

export const operator = ac.newRole({
  event: ["read"],
  booth: ["read"],
  template: ["read"],
  printer: ["read"],
  printJob: ["create", "read", "cancel", "retry"],
  member: [],
  analytics: [],
  organization: [],
});

export const viewer = ac.newRole({
  event: ["read"],
  booth: ["read"],
  template: ["read"],
  printer: ["read"],
  printJob: ["read"],
  member: [],
  analytics: ["read"],
  organization: [],
});

/**
 * Maps directly onto `MemberRole` in the Prisma schema — keep 1:1. These
 * object keys are the actual role identifier strings BetterAuth's
 * organization plugin persists into `Member.role` (via the Prisma
 * adapter, the same column the enum constrains), so they must match the
 * enum's casing exactly or every invitation-accept/role-assignment write
 * fails as an invalid enum value at the database level.
 */
export const roles = { OWNER: owner, ADMIN: admin, MANAGER: manager, OPERATOR: operator, VIEWER: viewer };

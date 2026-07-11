import { describe, expect, it } from "vitest";
import { AuthError, assertRoleAtLeast, roleAtLeast } from "./role-hierarchy";

describe("roleAtLeast", () => {
  it("ranks OWNER above every other role", () => {
    expect(roleAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(roleAtLeast("OWNER", "MANAGER")).toBe(true);
    expect(roleAtLeast("OWNER", "OPERATOR")).toBe(true);
    expect(roleAtLeast("OWNER", "VIEWER")).toBe(true);
  });

  it("ranks VIEWER below every other role", () => {
    expect(roleAtLeast("VIEWER", "OPERATOR")).toBe(false);
    expect(roleAtLeast("VIEWER", "MANAGER")).toBe(false);
    expect(roleAtLeast("VIEWER", "ADMIN")).toBe(false);
    expect(roleAtLeast("VIEWER", "OWNER")).toBe(false);
  });

  it("treats equal roles as satisfying the minimum", () => {
    for (const role of ["OWNER", "ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const) {
      expect(roleAtLeast(role, role)).toBe(true);
    }
  });

  it("is strictly ordered: OWNER > ADMIN > MANAGER > OPERATOR > VIEWER", () => {
    expect(roleAtLeast("ADMIN", "OWNER")).toBe(false);
    expect(roleAtLeast("MANAGER", "ADMIN")).toBe(false);
    expect(roleAtLeast("OPERATOR", "MANAGER")).toBe(false);
    expect(roleAtLeast("MANAGER", "OPERATOR")).toBe(true);
    expect(roleAtLeast("ADMIN", "MANAGER")).toBe(true);
  });
});

describe("assertRoleAtLeast", () => {
  it("does not throw when the role satisfies the minimum", () => {
    expect(() => assertRoleAtLeast("ADMIN", "MANAGER")).not.toThrow();
    expect(() => assertRoleAtLeast("OWNER", "OWNER")).not.toThrow();
  });

  it("throws a FORBIDDEN AuthError when the role is insufficient", () => {
    expect(() => assertRoleAtLeast("VIEWER", "OPERATOR")).toThrow(AuthError);
    try {
      assertRoleAtLeast("OPERATOR", "ADMIN");
      throw new Error("expected assertRoleAtLeast to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("FORBIDDEN");
      expect((err as AuthError).message).toContain("ADMIN");
    }
  });
});

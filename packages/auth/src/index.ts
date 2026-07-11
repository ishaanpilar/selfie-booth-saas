import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@selfie-booth/database";
import { ac, roles } from "./permissions";

/**
 * Single BetterAuth instance shared by every API route and server component.
 * The `organization` plugin backs multi-tenancy: an authenticated user can
 * belong to many organizations (Member rows), and `session.activeOrganizationId`
 * scopes which tenant's data a request can see — every server-side data
 * access in packages/core must read that value rather than trusting a
 * client-supplied organizationId.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 10,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day of activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7,
      sendInvitationEmail: async (data) => {
        // Wired to the transactional email provider in the web app's
        // notification service; kept here as the integration seam so the
        // auth package stays free of a hard email-vendor dependency.
        const { sendInvitationEmail } = await import("./notifications");
        await sendInvitationEmail(data);
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export * from "./permissions";

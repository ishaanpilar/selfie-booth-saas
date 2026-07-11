interface InvitationEmailData {
  email: string;
  invitation: { id: string; organizationId: string; role: string; expiresAt: Date };
  organization: { id: string; name: string };
  inviter: { user: { name: string; email: string } };
}

/**
 * Email delivery is swappable via RESEND_API_KEY: unset (local/dev) logs the
 * invite link instead of sending, so the auth flow is fully testable without
 * a real mail provider. Set the key to route through Resend in staging/prod.
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  const acceptUrl = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/invite/${data.invitation.id}`;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(
      `[auth:invitation] ${data.inviter.user.email} invited ${data.email} to "${data.organization.name}" as ${data.invitation.role}. Accept: ${acceptUrl}`,
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Selfie Booth <no-reply@selfiebooth.app>",
      to: data.email,
      subject: `You've been invited to join ${data.organization.name}`,
      html: `<p>${data.inviter.user.name} invited you to join <strong>${data.organization.name}</strong> as <strong>${data.invitation.role}</strong>.</p><p><a href="${acceptUrl}">Accept invitation</a> (expires ${data.invitation.expiresAt.toDateString()})</p>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send invitation email: ${res.status} ${await res.text()}`);
  }
}

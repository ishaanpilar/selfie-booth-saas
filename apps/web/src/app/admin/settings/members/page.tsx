import { Badge, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { InviteMemberButton } from "@/components/admin/members/invite-member-button";

export const dynamic = "force-dynamic";

const ROLE_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  OWNER: "success",
  ADMIN: "info",
  MANAGER: "info",
  OPERATOR: "neutral",
  VIEWER: "neutral",
};

export default async function MembersPage() {
  const { organizationId } = await requireActiveOrg();
  const [members, invitations] = await Promise.all([
    prisma.member.findMany({ where: { organizationId }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { organizationId, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Who has access to this organization.</p>
        </div>
        <InviteMemberButton />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.user.name}</TableCell>
              <TableCell>{member.user.email}</TableCell>
              <TableCell>
                <Badge tone={ROLE_TONE[member.role]}>{member.role}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="text-slate-400">Pending</TableCell>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>
                <Badge tone="warning">Invited as {invitation.role}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

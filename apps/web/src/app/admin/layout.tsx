import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@selfie-booth/database";
import { getServerSession } from "@/lib/auth-server";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const activeOrganizationId = session.session.activeOrganizationId;
  if (!activeOrganizationId) {
    redirect("/sign-up");
  }

  const organization = await prisma.organization.findUnique({ where: { id: activeOrganizationId }, select: { name: true } });
  if (!organization) {
    redirect("/sign-up");
  }

  return (
    <AdminShell orgName={organization.name} userName={session.user.name}>
      {children}
    </AdminShell>
  );
}

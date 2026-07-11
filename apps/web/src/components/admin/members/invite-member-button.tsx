"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button, Dialog, FormField, Input, useToast } from "@selfie-booth/ui";
import { inviteMember } from "@/lib/admin/actions";

export function InviteMemberButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await inviteMember(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      push({ tone: "success", title: "Invitation sent" });
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Invite member
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Invite a team member">
        <form action={submit} className="space-y-4">
          <FormField label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required />
          </FormField>
          <FormField label="Role" htmlFor="role">
            <select id="role" name="role" defaultValue="OPERATOR" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
              <option value="ADMIN">Admin — manage users, events, booths, templates</option>
              <option value="MANAGER">Manager — manage events/booths/templates</option>
              <option value="OPERATOR">Operator — run booths on-site</option>
              <option value="VIEWER">Viewer — read-only analytics</option>
            </select>
          </FormField>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={pending} disabled={pending}>
            Send invitation
          </Button>
        </form>
      </Dialog>
    </>
  );
}

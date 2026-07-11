"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Dialog, FormField, Input, useToast } from "@selfie-booth/ui";
import { createEvent } from "@/lib/admin/actions";

export function NewEventButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { push } = useToast();

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createEvent(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      push({ tone: "success", title: "Event created" });
      router.push(`/admin/events/${result.data.id}`);
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New event
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create event">
        <form action={submit} className="space-y-4">
          <FormField label="Event name" htmlFor="name">
            <Input id="name" name="name" required minLength={2} maxLength={120} placeholder="Summer Gala 2026" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Starts" htmlFor="startsAt">
              <Input id="startsAt" name="startsAt" type="date" />
            </FormField>
            <FormField label="Ends" htmlFor="endsAt">
              <Input id="endsAt" name="endsAt" type="date" />
            </FormField>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={pending} disabled={pending}>
            Create event
          </Button>
        </form>
      </Dialog>
    </>
  );
}

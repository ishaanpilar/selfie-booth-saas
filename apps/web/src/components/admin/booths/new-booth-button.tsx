"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Dialog, FormField, Input, useToast } from "@selfie-booth/ui";
import { createBooth } from "@/lib/admin/actions";

export function NewBoothButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { push } = useToast();

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createBooth(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      push({ tone: "success", title: "Booth created" });
      router.push(`/admin/booths/${result.data.id}`);
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New booth
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create booth">
        <form action={submit} className="space-y-4">
          <FormField label="Booth name" htmlFor="name">
            <Input id="name" name="name" required minLength={2} maxLength={120} placeholder="Booth 1 — Main Entrance" />
          </FormField>
          <FormField label="Countdown (seconds)" htmlFor="countdownSeconds">
            <Input id="countdownSeconds" name="countdownSeconds" type="number" min={1} max={10} defaultValue={3} />
          </FormField>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={pending} disabled={pending}>
            Create booth
          </Button>
        </form>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Dialog, FormField, Input, useToast } from "@selfie-booth/ui";
import { createTemplate } from "@/lib/admin/actions";

const LAYOUTS = [
  { value: "STRIP_2", label: "2-photo strip" },
  { value: "STRIP_3", label: "3-photo strip" },
  { value: "STRIP_4", label: "4-photo strip" },
  { value: "SINGLE", label: "Single photo" },
] as const;

export function NewTemplateButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { push } = useToast();

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createTemplate(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      push({ tone: "success", title: "Template created" });
      router.push(`/admin/templates/${result.data.id}`);
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New template
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create template">
        <form action={submit} className="space-y-4">
          <FormField label="Template name" htmlFor="name">
            <Input id="name" name="name" required minLength={2} maxLength={120} placeholder="Classic 3-Photo Strip" />
          </FormField>
          <FormField label="Layout" htmlFor="layoutType">
            <select id="layoutType" name="layoutType" defaultValue="STRIP_3" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
              {LAYOUTS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </FormField>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={pending} disabled={pending}>
            Create template
          </Button>
        </form>
      </Dialog>
    </>
  );
}

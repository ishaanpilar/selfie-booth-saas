"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button, Dialog, FormField, Input, useToast } from "@selfie-booth/ui";
import { createPrinter } from "@/lib/admin/actions";

export function NewPrinterButton({ booths }: { booths: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  const [connectionType, setConnectionType] = useState<"WEBUSB" | "LOCAL_AGENT" | "CLOUD">("LOCAL_AGENT");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createPrinter(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      push({ tone: "success", title: "Printer added" });
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add printer
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add printer">
        <form action={submit} className="space-y-4">
          <FormField label="Printer name" htmlFor="name">
            <Input id="name" name="name" required minLength={2} maxLength={120} placeholder="DNP DS620 — Booth 1" />
          </FormField>
          <FormField label="Booth" htmlFor="boothId">
            <select id="boothId" name="boothId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
              <option value="">Unassigned</option>
              {booths.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Connection type" htmlFor="connectionType">
            <select
              id="connectionType"
              name="connectionType"
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value as typeof connectionType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="LOCAL_AGENT">Local print agent (recommended)</option>
              <option value="WEBUSB">WebUSB</option>
              <option value="CLOUD">Cloud</option>
            </select>
          </FormField>
          {connectionType === "LOCAL_AGENT" && (
            <FormField label="Agent URL" htmlFor="agentBaseUrl" hint="e.g. https://127.0.0.1:9443 — the address the print agent listens on for this booth's machine.">
              <Input id="agentBaseUrl" name="agentBaseUrl" type="url" placeholder="https://127.0.0.1:9443" />
            </FormField>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={pending} disabled={pending}>
            Add printer
          </Button>
        </form>
      </Dialog>
    </>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button, FormField, Input } from "@selfie-booth/ui";
import { useBoothStore } from "@/lib/booth/booth-store";
import { createBoothSession } from "@/lib/booth/booth-api";

const FIELD_CONFIG = {
  name: { label: "Your name", type: "text", autoComplete: "name" },
  email: { label: "Email", type: "email", autoComplete: "email" },
  phone: { label: "Phone number", type: "tel", autoComplete: "tel" },
} as const;

export function GuestFormStage() {
  const { config, guestInfo, setGuestInfo, startSession, setStage, setError } = useBoothStore();
  const [values, setValues] = useState(guestInfo);
  const [submitting, setSubmitting] = useState(false);

  if (!config) return null;
  const fields = config.event.settings?.guestFields ?? [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setGuestInfo(values);
      const sessionId = await createBoothSession(config.booth.id, config.event.id, values);
      startSession(sessionId);
      setStage("camera");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a new session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Before we start…</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Just a couple details for your event host.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {fields.map((field) => {
          const cfg = FIELD_CONFIG[field];
          return (
            <FormField key={field} label={cfg.label} htmlFor={field}>
              <Input
                id={field}
                type={cfg.type}
                autoComplete={cfg.autoComplete}
                required={field === "name"}
                value={values[field] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
              />
            </FormField>
          );
        })}
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={submitting}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </motion.div>
  );
}

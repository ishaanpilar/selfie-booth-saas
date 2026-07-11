"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, FormField, Input, useToast } from "@selfie-booth/ui";
import { authClient } from "@selfie-booth/auth/client";

export default function SignUpPage() {
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message ?? "Unable to create account.");
      return;
    }

    const slug = orgName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { error: orgError } = await authClient.organization.create({ name: orgName, slug });
    setLoading(false);

    if (orgError) {
      setError(orgError.message ?? "Account created, but the organization could not be created. Contact support.");
      return;
    }

    push({ tone: "success", title: "Account created", description: `Welcome to ${orgName}.` });
    router.push("/admin");
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create your organization</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Start running selfie booths at your events.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Your name" htmlFor="name">
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Organization name" htmlFor="orgName">
            <Input id="orgName" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Password" htmlFor="password" hint="At least 10 characters." error={error ?? undefined}>
            <Input id="password" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <Button type="submit" className="w-full" loading={loading}>
            Create account
          </Button>
        </form>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

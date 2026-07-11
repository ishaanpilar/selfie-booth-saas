"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, FormField, Input, Spinner, useToast } from "@selfie-booth/ui";
import { authClient } from "@selfie-booth/auth/client";

export default function SignInPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({ email, password });
    setLoading(false);

    if (signInError) {
      setError(signInError.message ?? "Unable to sign in.");
      return;
    }

    push({ tone: "success", title: "Welcome back" });
    router.push(searchParams.get("redirect") ?? "/admin");
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sign in</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Access your organization&apos;s dashboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Password" htmlFor="password" error={error ?? undefined}>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

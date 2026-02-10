"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in to access your campaigns.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const supabase = createBrowserSupabaseClient();

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      setMessage("Signed in.");
      router.replace("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("Account created. Check your email if confirmation is enabled.");
    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#f5f0dd_0,#efe7ce_40%,#e8dcc0_100%)] text-zinc-900">
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-2xl border border-zinc-800/10 bg-white/90 p-6 shadow-sm backdrop-blur">
          <h1 className="text-3xl font-bold tracking-tight">DND Campaign Manager</h1>
          <p className="mt-2 text-sm text-zinc-700">
            {mode === "sign-in" ? "Welcome back." : "Create your account."}
          </p>
          <p className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100">{message}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                mode === "sign-in" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                mode === "sign-up" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Working..." : mode === "sign-in" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { employerApi } from "@/lib/api";
import { useVerifyStore } from "@/store";

type Values = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const setSession = useVerifyStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>();

  async function onSubmit(values: Values) {
    try {
      const data = await employerApi.login(values.email, values.password);
      setSession(data.token, data.employer);
      toast.success("Welcome back!", { description: data.employer.companyName });
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      toast.error("Sign in failed", { description: msg, duration: Infinity });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-navy-light px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">VERIDAQ</h1>
          <p className="text-white/60 text-sm mt-1">Employer Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-navy mb-1">Sign in to your account</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Verify academic credentials issued by Nigerian universities.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email", {
                  required: "Enter a valid email address",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password", {
                  required: "Password is required",
                })}
              />
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-navy font-semibold hover:underline">
              Register your company
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

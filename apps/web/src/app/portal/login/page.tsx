"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
// Custom inline icons — no lucide dependency
type IP = { className?: string };
const ShieldCheck = ({ className }: IP) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75}
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 2L16 5V10c0 3.5-6 8-6 8S4 13.5 4 10V5L10 2Z" />
    <path d="M7 10l2.5 2.5L13 8" />
  </svg>
);
const Loader2 = ({ className }: IP) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" className={className}>
    <circle cx="10" cy="10" r="7" strokeOpacity={0.2} />
    <path d="M10 3a7 7 0 017 7" />
  </svg>
);
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { api } from "@/lib/portal/api";
import { usePortalStore } from "@/store/portal";
import { LogoFull } from "@/components/logo";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof schema>;

const loginFormResolver: Resolver<LoginValues> = async (values) => {
  const parsed = schema.safeParse(values);

  if (parsed.success) {
    return {
      values: parsed.data,
      errors: {},
    };
  }

  const errors: FieldErrors<LoginValues> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      (errors as Record<string, { type: string; message: string }>)[field] = {
        type: issue.code,
        message: issue.message,
      };
    }
  }

  return {
    values: {},
    errors,
  };
};

export default function LoginPage() {
  const router = useRouter();
  const setSession = usePortalStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: loginFormResolver });

  async function onSubmit(values: LoginValues) {
    try {
      const data = await api.loginInstitution(values.email, values.password);
      // Server sets httpOnly cookie; we also persist in store for client usage
      setSession(data.token, data.institution);
      toast.success("Welcome back!", {
        description: `Signed in as ${data.institution.name}`,
      });
      router.push("/portal/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to sign in. Please try again.";
      toast.error("Sign in failed", { description: msg, duration: Infinity });
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — navy brand column */}
      <div className="hidden lg:flex w-[420px] bg-[#520061] flex-col justify-between p-12 shrink-0">
        <LogoFull variant="light" />
        <div>
          <p className="text-2xl font-bold text-white leading-snug mb-3">
            Institution Portal
          </p>
          <p className="text-white/50 text-sm leading-relaxed">
            Issue verifiable credentials, manage claim schemas, and review employer
            verification requests — all from one dashboard.
          </p>
        </div>
        <p className="text-xs text-white/25">© {new Date().getFullYear()} VERIDAQ</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <LogoFull className="mb-6 lg:hidden" />
            <h1 className="text-2xl font-bold text-[#520061] tracking-tight mb-1">
              Sign in to your account
            </h1>
            <p className="text-sm text-[#520061]/50">
              Enter your institution credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@university.edu"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#520061] hover:bg-[#6B1953] text-white font-semibold h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-[#520061]/40">
            Need access?{" "}
            <a href="/" className="text-[#520061] font-medium hover:underline">
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

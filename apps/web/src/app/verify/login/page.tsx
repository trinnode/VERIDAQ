"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import Link from "next/link";
import { Button } from "@/components/verify/ui/button";
import { Input } from "@/components/verify/ui/input";
import { Label } from "@/components/verify/ui/label";
import { employerApi } from "@/lib/verify/api";
import { useVerifyStore } from "@/store/verify";

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
      router.push("/verify/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      toast.error("Sign in failed", { description: msg, duration: Infinity });
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] bg-[#520061] flex-col justify-between p-12 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">VERIDAQ</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-white leading-snug mb-3">
            Employer Portal
          </p>
          <p className="text-white/50 text-sm leading-relaxed">
            Submit zero-knowledge credential verification requests and get instant
            on-chain attestations — without exposing graduate records.
          </p>
        </div>
        <p className="text-xs text-white/25">© {new Date().getFullYear()} VERIDAQ</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-7 h-7 bg-[#520061] rounded-md flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[#520061]">VERIDAQ</span>
            </div>
            <h1 className="text-2xl font-bold text-[#520061] tracking-tight mb-1">
              Sign in to your account
            </h1>
            <p className="text-sm text-[#520061]/50">
              Verify academic credentials issued by institutions.
            </p>
          </div>

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
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <Button
              type="submit"
              className="w-full bg-[#520061] hover:bg-[#6B1953] text-white font-semibold h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#520061]/50">
            Don&apos;t have an account?{" "}
            <Link href="/verify/register" className="text-[#520061] font-semibold hover:underline">
              Register your company
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-[#520061]/40">
            <a href="/" className="hover:underline">← Back to VERIDAQ</a>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { employerApi } from "@/lib/api";

type Values = {
  companyName: string;
  cacNumber: string;
  websiteUrl?: string;
  contactName: string;
  contactNin: string;
  contactEmail: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export default function RegisterPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>();

  async function onSubmit(values: Values) {
    try {
      await employerApi.register({
        companyName: values.companyName,
        cacNumber: values.cacNumber,
        websiteUrl: values.websiteUrl ?? "",
        contactName: values.contactName,
        contactNin: values.contactNin,
        contactEmail: values.contactEmail,
        password: values.password,
        acceptedTerms: values.acceptedTerms,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error("Registration failed", { description: msg, duration: Infinity });
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-navy-light px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/15 mb-2">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-navy">Application Submitted</h2>
          <p className="text-muted-foreground text-sm">
            Thank you for registering. Your KYC application is under review. You'll receive an
            email once your account has been approved by the VERIDAQ team.
          </p>
          <Button variant="outline" asChild className="mt-2">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-navy-light px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VERIDAQ</h1>
          <p className="text-white/60 text-sm mt-0.5">Register Your Company</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            {/* Company details */}
            <div>
              <h3 className="font-bold text-navy mb-3">Company Details</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Company name *</Label>
                  <Input
                    id="companyName"
                    {...register("companyName", {
                      required: "Company name is required",
                      minLength: { value: 2, message: "Company name is required" },
                    })}
                  />
                  {errors.companyName && <p className="text-xs text-danger">{errors.companyName.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cacNumber">CAC number *</Label>
                    <Input
                      id="cacNumber"
                      placeholder="RC123456"
                      {...register("cacNumber", {
                        required: "Enter a valid CAC number",
                        minLength: { value: 4, message: "Enter a valid CAC number" },
                      })}
                    />
                    {errors.cacNumber && <p className="text-xs text-danger">{errors.cacNumber.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="websiteUrl">Website</Label>
                    <Input
                      id="websiteUrl"
                      placeholder="https://company.com"
                      {...register("websiteUrl", {
                        validate: (value) => {
                          if (!value) return true;
                          try {
                            new URL(value);
                            return true;
                          } catch {
                            return "Enter a valid URL";
                          }
                        },
                      })}
                    />
                    {errors.websiteUrl && <p className="text-xs text-danger">{errors.websiteUrl.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact person */}
            <div>
              <h3 className="font-bold text-navy mb-3">Contact Person</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contactName">Full name *</Label>
                    <Input
                      id="contactName"
                      {...register("contactName", {
                        required: "Contact name is required",
                        minLength: { value: 2, message: "Contact name is required" },
                      })}
                    />
                    {errors.contactName && <p className="text-xs text-danger">{errors.contactName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactNin">NIN or passport number *</Label>
                    <Input
                      id="contactNin"
                      {...register("contactNin", {
                        required: "Enter a valid NIN or passport number",
                        minLength: { value: 6, message: "Enter a valid NIN or passport number" },
                      })}
                    />
                    {errors.contactNin && <p className="text-xs text-danger">{errors.contactNin.message}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactEmail">Official company email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    {...register("contactEmail", {
                      required: "Enter a valid email address",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Enter a valid email address",
                      },
                    })}
                  />
                  {errors.contactEmail && <p className="text-xs text-danger">{errors.contactEmail.message}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Password */}
            <div>
              <h3 className="font-bold text-navy mb-3">Account Password</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register("password", {
                      required: "Password must be at least 8 characters",
                      minLength: { value: 8, message: "Password must be at least 8 characters" },
                    })}
                  />
                  {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    {...register("confirmPassword", {
                      validate: (value) => value === watch("password") || "Passwords do not match",
                    })}
                  />
                  {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-navy"
                {...register("acceptedTerms", {
                  validate: (v) => v || "You must accept the terms of service",
                })}
              />
              <Label htmlFor="terms" className="font-normal text-sm cursor-pointer">
                I have read and accept the{" "}
                <a href="#" className="text-navy font-semibold hover:underline">
                  VERIDAQ Terms of Service
                </a>{" "}
                and understand that my company information will be reviewed before activation.
              </Label>
            </div>
            {errors.acceptedTerms && <p className="text-xs text-danger -mt-2">{errors.acceptedTerms.message}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting application…</>
              ) : (
                "Submit Registration"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-navy font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

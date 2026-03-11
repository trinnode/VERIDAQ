"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api";
import { useConsoleStore } from "@/store";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const setSession = useConsoleStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await adminApi.login(data.email, data.password);
      setSession(res.token, res.admin);
      toast.success("Logged in", { duration: 4000 });
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error("Login failed", { description: message, duration: Infinity });
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-navy/10 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-navy" />
            </div>
          </div>
          <CardTitle className="text-navy text-xl">VERIDAQ Console</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Platform Administration</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email", {
                  required: "Enter a valid email",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email",
                  },
                })}
                className={errors.email ? "border-danger" : ""}
              />
              {errors.email && (
                <p className="text-xs text-danger">{errors.email.message}</p>
              )}
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
                className={errors.password ? "border-danger" : ""}
              />
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-navy hover:bg-navy-light"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

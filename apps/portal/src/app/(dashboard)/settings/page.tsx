"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Building2, Lock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/lib/queries";
import { usePortalStore } from "@/store";
import { api } from "@/lib/api";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  address: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateInstitution = usePortalStore((s) => s.updateInstitution);
  const token = usePortalStore((s) => s.token);

  // ── Profile form ────────────────────────────────────────────────────────
  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting, isDirty: profileDirty },
  } = useForm<ProfileValues>({
    resolver: async (values) => {
      const r = profileSchema.safeParse(values);
      if (r.success) return { values: r.data, errors: {} };
      const errs: Record<string, { type: string; message: string }> = {};
      for (const issue of r.error.issues) {
        const k = String(issue.path[0] ?? "");
        if (k) errs[k] = { type: "validation", message: issue.message };
      }
      return { values: {} as ProfileValues, errors: errs };
    },
    defaultValues: {
      name: profile?.name ?? "",
      email: profile?.email ?? "",
      website: profile?.websiteUrl ?? "",
      address: profile?.addressLine ?? "",
    },
  });

  React.useEffect(() => {
    if (profile) {
      resetProfile({
        name: profile.name ?? "",
        email: profile.email ?? "",
        website: profile.websiteUrl ?? "",
        address: profile.addressLine ?? "",
      });
    }
  }, [profile, resetProfile]);

  async function onProfileSubmit(values: ProfileValues) {
    if (!token) return;
    try {
      const updated = await api.updateProfile(token, {
        name: values.name,
        email: values.email,
        websiteUrl: values.website,
        addressLine: values.address,
      });
      updateInstitution(updated);
      toast.success("Profile updated", { description: "Your institution details have been saved." });
      resetProfile(values);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error("Could not update profile", { description: msg, duration: Infinity });
    }
  }

  // ── Password form ───────────────────────────────────────────────────────
  const {
    register: regPwd,
    handleSubmit: handlePwdSubmit,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: pwdSubmitting },
  } = useForm<PasswordValues>({
    resolver: async (values) => {
      const r = passwordSchema.safeParse(values);
      if (r.success) return { values: r.data, errors: {} };
      const errs: Record<string, { type: string; message: string }> = {};
      for (const issue of r.error.issues) {
        const k = String(issue.path[0] ?? "");
        if (k) errs[k] = { type: "validation", message: issue.message };
      }
      return { values: {} as PasswordValues, errors: errs };
    },
  });

  async function onPasswordSubmit(values: PasswordValues) {
    if (!token) return;
    try {
      await api.request("/v1/institution/password", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      toast.success("Password changed", { description: "Your password has been updated." });
      resetPwd();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password change failed";
      toast.error("Could not change password", { description: msg, duration: Infinity });
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-muted-foreground mt-0.5">
          Manage your institution profile and account settings.
        </p>
      </div>

      {/* Institution Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-navy/8">
              <Building2 className="w-5 h-5 text-navy" />
            </div>
            <div>
              <CardTitle>Institution Profile</CardTitle>
              <CardDescription>Update your institution's public information.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="institution-name">Institution name *</Label>
                <Input id="institution-name" {...regProfile("name")} />
                {profileErrors.name && (
                  <p className="text-xs text-danger">{profileErrors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institution-email">Email address *</Label>
                <Input id="institution-email" type="email" {...regProfile("email")} />
                {profileErrors.email && (
                  <p className="text-xs text-danger">{profileErrors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institution-website">Website</Label>
                <Input id="institution-website" placeholder="https://" {...regProfile("website")} />
                {profileErrors.website && (
                  <p className="text-xs text-danger">{profileErrors.website.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institution-address">Address</Label>
                <Input id="institution-address" {...regProfile("address")} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={profileSubmitting || !profileDirty || isLoading}>
                {profileSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-navy/8">
              <Lock className="w-5 h-5 text-navy" />
            </div>
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your institution account password.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePwdSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" autoComplete="current-password" {...regPwd("currentPassword")} />
              {pwdErrors.currentPassword && (
                <p className="text-xs text-danger">{pwdErrors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" {...regPwd("newPassword")} />
              {pwdErrors.newPassword && (
                <p className="text-xs text-danger">{pwdErrors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" {...regPwd("confirmPassword")} />
              {pwdErrors.confirmPassword && (
                <p className="text-xs text-danger">{pwdErrors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={pwdSubmitting}>
                {pwdSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Changing…</>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

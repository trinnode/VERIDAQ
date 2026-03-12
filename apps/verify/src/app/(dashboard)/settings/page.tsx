"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, Building2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/lib/queries";
import { useVerifyStore } from "@/store";
import { employerApi, type Employer } from "@/lib/api";

type ProfileForm = {
  companyName: string;
  email: string;
  website?: string;
  address?: string;
  contactName: string;
  contactPhone?: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SettingsPage() {
  const { data: profileData, isLoading, refetch } = useProfile();
  const updateEmployer = useVerifyStore((s) => s.updateEmployer);

  const [profileSaving, setProfileSaving] = React.useState(false);
  const [passwordSaving, setPasswordSaving] = React.useState(false);

  const profileForm = useForm<ProfileForm>({
    defaultValues: { companyName: "", email: "", website: "", address: "", contactName: "", contactPhone: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Populate form when data loads
  React.useEffect(() => {
    if (profileData) {
      const e = profileData;
      profileForm.reset({
        companyName: e.companyName ?? "",
        email: e.email ?? "",
        website: e.website ?? "",
        address: e.address ?? "",
        contactName: e.contactName ?? "",
        contactPhone: e.contactPhone ?? "",
      });
    }
  }, [profileData]);

  const onSaveProfile = async (data: ProfileForm) => {
    setProfileSaving(true);
    try {
      const updated = await employerApi.request<{ employer: Employer }>("/v1/employer/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      updateEmployer(updated.employer);
      await refetch();
      toast.success("Profile updated", {
        description: "Your company profile has been saved.",
        duration: 4000,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      toast.error("Update failed", { description: message, duration: Infinity });
    } finally {
      setProfileSaving(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    setPasswordSaving(true);
    try {
      await employerApi.request("/v1/employer/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      passwordForm.reset();
      toast.success("Password changed", {
        description: "Your password has been updated successfully.",
        duration: 4000,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to change password";
      toast.error("Password change failed", { description: message, duration: Infinity });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-muted-foreground mt-0.5">Manage your account and company profile.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-navy" />
            <CardTitle className="text-base">Company Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-10 w-full bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    {...profileForm.register("companyName", {
                      required: "Company name is required",
                      minLength: { value: 2, message: "Company name is required" },
                    })}
                    className={profileForm.formState.errors.companyName ? "border-danger" : ""}
                  />
                  {profileForm.formState.errors.companyName && (
                    <p className="text-xs text-danger">{profileForm.formState.errors.companyName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register("email", {
                      required: "Enter a valid email",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Enter a valid email",
                      },
                    })}
                    className={profileForm.formState.errors.email ? "border-danger" : ""}
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-xs text-danger">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    {...profileForm.register("website", {
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
                  {profileForm.formState.errors.website && (
                    <p className="text-xs text-danger">{profileForm.formState.errors.website.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactName">Contact Person</Label>
                  <Input
                    id="contactName"
                    {...profileForm.register("contactName", {
                      required: "Contact person name is required",
                      minLength: { value: 2, message: "Contact person name is required" },
                    })}
                    className={profileForm.formState.errors.contactName ? "border-danger" : ""}
                  />
                  {profileForm.formState.errors.contactName && (
                    <p className="text-xs text-danger">{profileForm.formState.errors.contactName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input id="contactPhone" placeholder="+234 800 000 0000" {...profileForm.register("contactPhone")} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="123 Marina St, Lagos" {...profileForm.register("address")} />
                </div>
              </div>
              <Button
                type="submit"
                className="bg-navy hover:bg-navy-light"
                disabled={profileSaving}
              >
                {profileSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-navy" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register("currentPassword", {
                  required: "Current password is required",
                })}
                className={passwordForm.formState.errors.currentPassword ? "border-danger" : ""}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-danger">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("newPassword", {
                  required: "Minimum 8 characters",
                  minLength: { value: 8, message: "Minimum 8 characters" },
                })}
                className={passwordForm.formState.errors.newPassword ? "border-danger" : ""}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-danger">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("confirmPassword", {
                  required: "Please confirm your new password",
                  validate: (value) =>
                    value === passwordForm.getValues("newPassword") || "Passwords do not match",
                })}
                className={passwordForm.formState.errors.confirmPassword ? "border-danger" : ""}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-danger">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={passwordSaving}
            >
              {passwordSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, History, CreditCard, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useVerifications } from "@/lib/queries";
import { useVerifyStore } from "@/store";
import { formatDate, verificationStatusLabel } from "@/lib/utils";

export default function DashboardPage() {
  const employer = useVerifyStore((s) => s.employer);
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: verifications, isLoading: verificationsLoading } = useVerifications();

  const remaining = profileData?.freeVerificationsRemaining ?? 0;
  const lowQuota = remaining <= 1 && !profileLoading;
  const noQuota = remaining === 0 && !profileLoading;

  const recent = verifications?.slice(0, 5) ?? [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">
          Welcome, {employer?.companyName ?? "Employer"} 👋
        </h1>
        <p className="text-muted-foreground mt-0.5">
          Here's a quick overview of your verification activity.
        </p>
      </div>

      {/* Quota warning */}
      {noQuota && (
        <div className="rounded-xl bg-danger/10 border border-danger/30 p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-danger">You've used all your free verifications</p>
            <p className="text-sm text-danger/80 mt-1">
              Your 3 lifetime free verifications have been used. Upgrade your plan to continue
              verifying credentials.
            </p>
          </div>
          <Button asChild variant="destructive" size="sm">
            <Link href="/billing">Upgrade Now</Link>
          </Button>
        </div>
      )}
      {lowQuota && !noQuota && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-warning">1 free verification remaining</p>
            <p className="text-sm text-warning/80 mt-1">
              After this, you'll need to upgrade to continue making verification requests.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-warning text-warning">
            <Link href="/billing">View Plans</Link>
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Free Verifications Left</CardTitle>
            <ShieldCheck className="w-5 h-5 text-navy" />
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className={`text-3xl font-bold ${noQuota ? "text-danger" : "text-navy"}`}>
                {remaining}
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            <History className="w-5 h-5 text-navy" />
          </CardHeader>
          <CardContent>
            {verificationsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-bold text-navy">{verifications?.length ?? 0}</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subscription</CardTitle>
            <CreditCard className="w-5 h-5 text-navy" />
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <Badge variant="muted" className="text-sm">
                {profileData?.employer.subscriptionTier ?? "FREE"}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick action */}
      <div>
        <h2 className="text-base font-bold text-navy mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/verify" className="group">
            <Card className="hover:border-navy/30 hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-navy/8 flex items-center justify-center group-hover:bg-navy/12 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-navy">New Verification Request</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Verify a student's academic credential</p>
                </div>
                <ArrowRight className="w-4 h-4 text-navy/40 group-hover:text-navy transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/verifications" className="group">
            <Card className="hover:border-navy/30 hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-navy/8 flex items-center justify-center group-hover:bg-navy/12 transition-colors">
                  <History className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-navy">View History</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Review all past verification requests</p>
                </div>
                <ArrowRight className="w-4 h-4 text-navy/40 group-hover:text-navy transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent verifications */}
      {!verificationsLoading && recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-navy">Recent Verifications</h2>
            <Link href="/verifications" className="text-sm text-navy hover:underline">
              View all
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {recent.map((v) => {
                  const { label, variant } = verificationStatusLabel(v.status);
                  return (
                    <li key={v.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{v.claimLabel ?? v.claimCode}</p>
                        <p className="text-xs text-muted-foreground">{v.institutionName ?? v.institutionId}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{formatDate(v.requestedAt)}</span>
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/lib/queries";

const PLANS = [
  {
    id: "FREE",
    name: "Free Tier",
    price: "₦0",
    description: "Get started with 3 lifetime verifications",
    features: [
      "3 lifetime verification requests",
      "PDF verification reports",
      "Basic email support",
    ],
    highlight: false,
  },
  {
    id: "BASIC",
    name: "Basic",
    price: "₦5,000 / mo",
    description: "For small teams doing occasional verification",
    features: [
      "50 verifications per month",
      "PDF reports with VERIDAQ branding",
      "Priority email support",
      "Bulk export",
    ],
    highlight: true,
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: "₦15,000 / mo",
    description: "For growing organizations with frequent hiring",
    features: [
      "200 verifications per month",
      "White-labelled PDF reports",
      "Dedicated support channel",
      "API access",
      "Team member accounts",
    ],
    highlight: false,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    description: "Unlimited verifications and custom integration",
    features: [
      "Unlimited verifications",
      "Custom SLA",
      "On-premise deployment option",
      "Dedicated account manager",
      "Custom API integration",
    ],
    highlight: false,
  },
];

export default function BillingPage() {
  const { data: profileData, isLoading } = useProfile();

  const tier = profileData?.employer.subscriptionTier ?? "FREE";
  const remaining = profileData?.freeVerificationsRemaining ?? 0;
  const isFree = tier === "FREE";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Billing &amp; Subscription</h1>
        <p className="text-muted-foreground mt-0.5">
          Manage your plan and verification quota.
        </p>
      </div>

      {/* Current plan status */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Current Plan</CardTitle>
          <CreditCard className="w-5 h-5 text-navy" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-navy">{tier}</span>
                  <Badge variant={tier === "FREE" ? "muted" : "success"}>Active</Badge>
                </div>
                {isFree && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {remaining} of 3 free verifications remaining
                  </p>
                )}
              </div>
              {isFree && remaining === 0 && (
                <div className="flex items-center gap-2 text-sm text-danger">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Quota exhausted — upgrade to continue</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Free tier progress */}
      {isFree && !isLoading && (
        <Card className={remaining <= 1 ? "border-warning/40" : ""}>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Free Verifications Used</span>
              <span className="text-muted-foreground">{3 - remaining} / 3</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  remaining === 0 ? "bg-danger" : remaining === 1 ? "bg-warning" : "bg-success"
                }`}
                style={{ width: `${((3 - remaining) / 3) * 100}%` }}
              />
            </div>
            {remaining <= 1 && (
              <p className="text-xs text-warning flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {remaining === 0
                  ? "All free verifications exhausted. Upgrade to continue."
                  : "Only 1 verification remaining before you need to upgrade."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Plans */}
      <div>
        <h2 className="text-base font-bold text-navy mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = tier === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.highlight ? "border-navy shadow-md" : ""
                } ${isCurrentPlan ? "ring-2 ring-success/50" : ""}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-navy text-white">Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-3">
                    <Badge variant="success">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
                  <p className="text-2xl font-bold text-navy mt-1">{plan.price}</p>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                  {!isCurrentPlan && plan.id !== "ENTERPRISE" && (
                    <button
                      className="mt-4 w-full rounded-lg bg-navy py-2 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
                      onClick={() => alert("Contact sales to upgrade your plan.")}
                    >
                      Upgrade
                    </button>
                  )}
                  {plan.id === "ENTERPRISE" && (
                    <button
                      className="mt-4 w-full rounded-lg border border-navy py-2 text-sm font-semibold text-navy hover:bg-navy/5 transition-colors"
                      onClick={() => alert("Contact sales@veridaq.ng for enterprise pricing.")}
                    >
                      Contact Sales
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

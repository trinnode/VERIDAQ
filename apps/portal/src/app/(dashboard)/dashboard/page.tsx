"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileStack,
  ShieldCheck,
  FileBadge2,
  Upload,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats, usePaymasterBalance } from "@/lib/queries";
import { usePortalStore } from "@/store";
import { formatDate } from "@/lib/utils";

function StatCard({
  title,
  value,
  icon: Icon,
  badge,
  badgeVariant,
  loading,
}: {
  title: string;
  value: number | string | undefined;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: "success" | "warning" | "pending" | "danger" | "muted";
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-navy/8">
          <Icon className="w-5 h-5 text-navy" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-navy">{value ?? "—"}</span>
            {badge && (
              <Badge variant={badgeVariant ?? "muted"} className="mb-1">
                {badge}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const quickLinks = [
  {
    href: "/upload",
    icon: Upload,
    label: "Upload Credentials",
    description: "Issue a new batch of credentials",
  },
  {
    href: "/verifications",
    icon: ShieldCheck,
    label: "Review Verifications",
    description: "Approve or decline pending requests",
  },
  {
    href: "/claims",
    icon: FileBadge2,
    label: "Manage Claims",
    description: "Define and edit credential claim types",
  },
  {
    href: "/batches",
    icon: FileStack,
    label: "View Batches",
    description: "Track credential batch status",
  },
];

export default function DashboardPage() {
  const institution = usePortalStore((s) => s.institution);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: balanceData, isLoading: balanceLoading } = usePaymasterBalance();

  const firstName = institution?.name?.split(" ")[0] ?? "there";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">
          Good {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-0.5">
          Here's what's happening with {institution?.name ?? "your institution"} today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Batches"
          value={stats?.totalBatches}
          icon={FileStack}
          loading={statsLoading}
        />
        <StatCard
          title="Credentials Issued"
          value={stats?.totalCredentials}
          icon={TrendingUp}
          loading={statsLoading}
        />
        <StatCard
          title="Pending Verifications"
          value={stats?.pendingVerifications}
          icon={Clock}
          badge={stats?.pendingVerifications ? "Needs review" : undefined}
          badgeVariant="warning"
          loading={statsLoading}
        />
        <StatCard
          title="Paymaster Balance"
          value={
            balanceData
              ? `${Number(balanceData.balanceMatic).toLocaleString()} MATIC`
              : undefined
          }
          icon={Wallet}
          loading={balanceLoading}
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verifications Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-2xl font-bold text-success">
                  {stats?.verifiedCount ?? 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verifications Declined
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-danger" />
                <span className="text-2xl font-bold text-danger">
                  {stats?.declinedCount ?? 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-warning" />
                <span className="text-2xl font-bold text-warning">
                  {stats?.failedBatches ?? 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-bold text-navy mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(({ href, icon: Icon, label, description }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full hover:border-navy/30 hover:shadow-md transition-all duration-200">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-navy/8 group-hover:bg-navy/12 transition-colors">
                    <Icon className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-navy">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-navy/40 group-hover:text-navy transition-colors mt-auto" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity hint */}
      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href="/audit">
            View full audit log <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

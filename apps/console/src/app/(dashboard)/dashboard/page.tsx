"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Users, ShieldCheck, Activity, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats, useSystemHealth } from "@/lib/queries";
import { useConsoleStore } from "@/store";

export default function ConsoleDashboardPage() {
  const admin = useConsoleStore((s) => s.admin);
  const { data: stats, isLoading } = useDashboardStats();
  const { data: health, isLoading: healthLoading } = useSystemHealth();

  const blockchainStatus = health?.blockchain.status ?? "ok";
  const apiErrorRate = health?.api.errorRate ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">
          Platform Overview
        </h1>
        <p className="text-muted-foreground mt-0.5">
          Welcome back, {admin?.name ?? "Admin"}.
        </p>
      </div>

      {/* System alerts */}
      {!healthLoading && blockchainStatus !== "ok" && (
        <div className="rounded-xl bg-danger/10 border border-danger/30 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          <p className="text-sm text-danger font-medium">
            Blockchain connectivity is {blockchainStatus}. Check the{" "}
            <Link href="/health" className="underline">Health Dashboard</Link>.
          </p>
        </div>
      )}
      {!healthLoading && apiErrorRate > 0.05 && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <p className="text-sm text-warning font-medium">
            API error rate is elevated ({(apiErrorRate * 100).toFixed(1)}%). Check{" "}
            <Link href="/health" className="underline">system health</Link>.
          </p>
        </div>
      )}

      {/* KYC queue alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          loading={isLoading}
          icon={<Building2 className="w-5 h-5 text-navy" />}
          label="Institutions"
          value={stats?.totalInstitutions}
          sub={stats?.pendingInstitutionKyc ? `${stats.pendingInstitutionKyc} pending KYC` : "All reviewed"}
          subVariant={stats?.pendingInstitutionKyc ? "warning" : "ok"}
          href="/institutions"
        />
        <StatCard
          loading={isLoading}
          icon={<Users className="w-5 h-5 text-navy" />}
          label="Employers"
          value={stats?.totalEmployers}
          sub={stats?.pendingEmployerKyc ? `${stats.pendingEmployerKyc} pending KYC` : "All reviewed"}
          subVariant={stats?.pendingEmployerKyc ? "warning" : "ok"}
          href="/employers"
        />
        <StatCard
          loading={isLoading}
          icon={<ShieldCheck className="w-5 h-5 text-navy" />}
          label="Total Verifications"
          value={stats?.totalVerifications}
          sub={stats?.verificationsToday ? `${stats.verificationsToday} today` : "None today"}
          subVariant="ok"
          href="/audit"
        />
        <StatCard
          loading={isLoading}
          icon={<Activity className="w-5 h-5 text-navy" />}
          label="Credentials Issued"
          value={stats?.totalCredentialsIssued}
          sub={`${stats?.totalActiveInstitutions ?? 0} active institutions`}
          subVariant="ok"
          href="/institutions"
        />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-base font-bold text-navy mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/institutions?status=PENDING", label: "Review Institution KYC", desc: "Pending institution applications" },
            { href: "/employers?status=PENDING", label: "Review Employer KYC", desc: "Pending employer applications" },
            { href: "/health", label: "System Health", desc: "Blockchain, queues, API, database" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="group">
              <Card className="hover:border-navy/30 hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-navy">{link.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-navy/40 group-hover:text-navy transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  loading,
  icon,
  label,
  value,
  sub,
  subVariant,
  href,
}: {
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  value?: number;
  sub: string;
  subVariant: "ok" | "warning";
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-navy/20 hover:shadow-sm transition-all cursor-pointer">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <span className="text-3xl font-bold text-navy">{value ?? 0}</span>
          )}
          <p className={`text-xs mt-1 ${subVariant === "warning" ? "text-warning font-medium" : "text-muted-foreground"}`}>
            {sub}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

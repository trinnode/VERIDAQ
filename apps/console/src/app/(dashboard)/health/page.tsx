"use client";

import * as React from "react";
import {
  Activity,
  Database,
  Server,
  Zap,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemHealth } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

function StatusIcon({ status }: { status: "ok" | "degraded" | "down" }) {
  if (status === "ok") return <CheckCircle2 className="w-5 h-5 text-success" />;
  if (status === "degraded") return <AlertTriangle className="w-5 h-5 text-warning" />;
  return <XCircle className="w-5 h-5 text-danger" />;
}

function StatusBadge({ status }: { status: "ok" | "degraded" | "down" }) {
  if (status === "ok") return <Badge variant="success">Healthy</Badge>;
  if (status === "degraded") return <Badge variant="warning">Degraded</Badge>;
  return <Badge variant="danger">Down</Badge>;
}

export default function HealthPage() {
  const { data: health, isLoading } = useSystemHealth();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">System Health</h1>
          <p className="text-muted-foreground mt-0.5">Live status of all platform services.</p>
        </div>
        {!isLoading && (
          <p className="text-xs text-muted-foreground">Refreshes every 20 seconds</p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="py-8"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !health ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-semibold text-navy">Health data unavailable</p>
            <p className="text-sm text-muted-foreground mt-1">Could not reach the API. Check server status.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Blockchain */}
          <Card className={health.blockchain.status !== "ok" ? "border-warning/40" : ""}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-navy" />
                <CardTitle className="text-base">Blockchain</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={health.blockchain.status} />
                <StatusBadge status={health.blockchain.status} />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Network</p>
                <p className="font-medium">{health.blockchain.networkName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Last Block</p>
                <p className="font-medium font-mono">{health.blockchain.lastBlock.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">RPC Latency</p>
                <p className={`font-medium ${health.blockchain.latencyMs > 2000 ? "text-warning" : ""}`}>
                  {health.blockchain.latencyMs}ms
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Paymaster */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-navy" />
                <CardTitle className="text-base">Paymaster</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Total Sponsored Pool</p>
                <p className="text-2xl font-bold text-navy">{health.paymaster.totalSponsoredBalance} MATIC</p>
              </div>
              {health.paymaster.institutionsBelow.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-warning flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Institutions below minimum threshold
                  </p>
                  <ul className="space-y-1.5">
                    {health.paymaster.institutionsBelow.map((inst) => (
                      <li key={inst.id} className="flex items-center justify-between text-sm">
                        <span>{inst.name}</span>
                        <span className="font-mono text-danger">{inst.balance} MATIC</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BullMQ Queues */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-navy" />
                <CardTitle className="text-base">Job Queues</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {health.queues.map((q) => (
                  <div key={q.name} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{q.name}</p>
                      {q.failed > 0 ? (
                        <Badge variant="danger">{q.failed} failed</Badge>
                      ) : (
                        <Badge variant="success">Healthy</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div><span className="text-muted-foreground">Waiting:</span> <span className="font-medium">{q.waiting}</span></div>
                      <div><span className="text-muted-foreground">Active:</span> <span className="font-medium">{q.active}</span></div>
                      <div><span className="text-muted-foreground">Done:</span> <span className="font-medium">{q.completed}</span></div>
                    </div>
                    {q.lastSuccessAt && (
                      <p className="text-xs text-muted-foreground">Last success: {formatDate(q.lastSuccessAt)}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* API metrics */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-navy" />
                  <CardTitle className="text-base">API</CardTitle>
                </div>
                <StatusBadge status={health.api.errorRate > 0.05 ? "degraded" : "ok"} />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Requests (last hour)" value={String(health.api.requestsLastHour)} />
                <Row
                  label="Error rate"
                  value={`${(health.api.errorRate * 100).toFixed(2)}%`}
                  highlight={health.api.errorRate > 0.05 ? "warning" : undefined}
                />
                <Row label="p95 response" value={`${health.api.p95ResponseMs}ms`} />
              </CardContent>
            </Card>

            {/* Database */}
            <Card className={health.database.status !== "ok" ? "border-warning/40" : ""}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-navy" />
                  <CardTitle className="text-base">Database</CardTitle>
                </div>
                <StatusBadge status={health.database.status} />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Pool size" value={String(health.database.connectionPoolSize)} />
                <Row label="Active connections" value={String(health.database.activeConnections)} />
                <Row
                  label="Slow queries"
                  value={String(health.database.slowQueryCount)}
                  highlight={health.database.slowQueryCount > 5 ? "warning" : undefined}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: "warning" | "danger" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight === "warning" ? "text-warning" : highlight === "danger" ? "text-danger" : ""}`}>
        {value}
      </span>
    </div>
  );
}

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useBatch } from "@/lib/queries";
import { formatDate, batchStatusLabel } from "@/lib/utils";

const STATUS_ICON: Record<string, React.ElementType> = {
  DONE: CheckCircle2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  PROCESSING: Loader2,
  SUBMITTING: Loader2,
  QUEUED: Clock,
  DRAFT: Clock,
};

const STATUS_COLOR: Record<string, string> = {
  DONE: "text-success",
  COMPLETED: "text-success",
  FAILED: "text-danger",
  PROCESSING: "text-pending",
  SUBMITTING: "text-pending",
  QUEUED: "text-warning",
  DRAFT: "text-muted-foreground",
};

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const router = useRouter();
  const { data: batch, isLoading, refetch, isRefetching } = useBatch(batchId);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col items-center justify-center py-24 space-y-4 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 text-warning" />
        <p className="text-lg font-semibold">Batch not found</p>
        <p className="text-sm">This batch may have been removed or the ID is incorrect.</p>
        <Button variant="outline" onClick={() => router.push("/batches")}>
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Batches
        </Button>
      </div>
    );
  }

  const label = batchStatusLabel(batch.status);
  const StatusIcon = STATUS_ICON[batch.status] ?? Clock;
  const statusColor = STATUS_COLOR[batch.status] ?? "text-muted-foreground";
  const spinning = ["PROCESSING", "SUBMITTING"].includes(batch.status);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/batches")}>
          <ArrowLeft className="mr-1 w-4 h-4" /> Batches
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono text-sm">{batch.id.slice(0, 16)}…</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Credential Batch</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Submitted {formatDate(batch.createdAt)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`mr-2 w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-6 h-6 ${statusColor} ${spinning ? "animate-spin" : ""}`} />
            <span className={`text-lg font-bold ${statusColor}`}>{label}</span>
          </div>
          {batch.status === "FAILED" && batch.errorReport && (
            <div className="rounded-lg bg-danger/10 border border-danger/30 p-4 text-sm text-danger">
              <p className="font-semibold mb-1">Error details</p>
              <p className="font-mono text-xs">This batch failed. Check the validation report below for details.</p>
            </div>
          )}
          {["PROCESSING", "SUBMITTING", "QUEUED"].includes(batch.status) && (
            <div className="rounded-lg bg-pending/10 border border-pending/30 p-4 text-sm text-pending">
              This batch is being processed. The page will auto-refresh while work is in progress.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ["Batch ID", batch.id],
            ["Total Records", batch.recordCount?.toLocaleString() ?? "—"],
            ["Processed Records", batch.passedCount?.toLocaleString() ?? "—"],
            ["Failed Records", batch.failedCount?.toLocaleString() ?? "—"],
            ["Created At", formatDate(batch.createdAt)],
            ["Confirmed At", batch.confirmedAt ? formatDate(batch.confirmedAt) : "—"],
          ].map(([label, value]) => (
            <React.Fragment key={label}>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium font-mono text-xs">{value as string}</span>
              </div>
              <Separator />
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Validation errors */}
      {batch.errorReport && batch.errorReport.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-danger">Validation Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {batch.errorReport.map((err, i) => (
                <li key={i} className="text-sm text-danger font-mono bg-danger/5 rounded p-2">
                  Row {err.row} {err.field ? `(${err.field})` : ""}: {err.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

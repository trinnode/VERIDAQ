"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBatches } from "@/lib/queries";
import { formatDate, batchStatusLabel } from "@/lib/utils";
import type { CredentialBatch } from "@/lib/api";

const STATUS_VARIANT: Record<string, "success" | "warning" | "pending" | "danger" | "muted"> = {
  DONE: "success",
  COMPLETED: "success",
  FAILED: "danger",
  PROCESSING: "pending",
  SUBMITTING: "pending",
  QUEUED: "warning",
  DRAFT: "muted",
};

function BatchRow({ batch }: { batch: CredentialBatch }) {
  const label = batchStatusLabel(batch.status);
  const v = STATUS_VARIANT[batch.status] ?? "muted";
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{batch.id.slice(0, 12)}…</TableCell>
      <TableCell className="font-medium">Credential Batch</TableCell>
      <TableCell>
        <Badge variant={v}>{label}</Badge>
      </TableCell>
      <TableCell className="tabular-nums text-sm">{batch.recordCount ?? "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatDate(batch.createdAt)}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/batches/${batch.id}`}>
            View <ArrowRight className="ml-1 w-3 h-3" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function BatchesPage() {
  const { data, isLoading, refetch, isRefetching } = useBatches();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Credential Batches</h1>
          <p className="text-muted-foreground mt-0.5">Track the status of all submitted credential batches.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/upload">Upload Credentials</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Claim Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <p className="text-base font-semibold">No batches yet</p>
                      <p className="text-sm">
                        When you upload credentials, your batches will appear here.
                      </p>
                      <Button asChild className="mt-2">
                        <Link href="/upload">Upload your first batch</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((batch) => <BatchRow key={batch.id} batch={batch} />)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

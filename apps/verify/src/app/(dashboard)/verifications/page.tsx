"use client";

import * as React from "react";
import Link from "next/link";
import { History, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVerifications } from "@/lib/queries";
import { verificationStatusLabel, formatDate } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "AUTO_PROCESSING", label: "Processing" },
  { value: "AWAITING_INSTITUTION", label: "Awaiting Review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "NOT_VERIFIED", label: "Not Verified" },
  { value: "DECLINED", label: "Declined" },
];

export default function VerificationsPage() {
  const { data: verifications, isLoading } = useVerifications();
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const items = verifications?.records ?? [];
  const filtered =
    statusFilter === "ALL"
      ? items
      : items.filter((v) => v.status === statusFilter);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Verification History</h1>
          <p className="text-muted-foreground mt-0.5">
            All credential verification requests you've submitted.
          </p>
        </div>
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credential Type</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <History className="w-10 h-10 text-muted-foreground/40" />
            <p className="font-semibold text-navy">
              {statusFilter === "ALL" ? "No verification requests yet" : "No results for this filter"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {statusFilter === "ALL"
                ? "Head over to Request Verification to start verifying candidate credentials."
                : "Try changing the status filter to see more results."}
            </p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credential Type</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => {
                  const { label, variant } = verificationStatusLabel(v.status);
                  return (
                    <TableRow key={v.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{v.claimLabel ?? v.claimCode}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.institutionName ?? v.institutionId}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {v.referenceNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(v.requestedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/verifications/${v.id}`}
                          className="flex items-center gap-1 text-xs text-navy hover:underline"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

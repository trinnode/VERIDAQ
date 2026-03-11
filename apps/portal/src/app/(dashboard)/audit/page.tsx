"use client";

import * as React from "react";
import { RefreshCw, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useAuditLogs } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

const ACTION_VARIANT: Record<string, "success" | "danger" | "pending" | "warning" | "muted"> = {
  BATCH_UPLOADED: "pending",
  BATCH_COMPLETED: "success",
  BATCH_FAILED: "danger",
  VERIFICATION_APPROVED: "success",
  VERIFICATION_DECLINED: "danger",
  CREDENTIAL_REVOKED: "warning",
  CLAIM_CREATED: "muted",
  CLAIM_UPDATED: "muted",
  CLAIM_DELETED: "danger",
  LOGIN: "muted",
  SETTINGS_UPDATED: "muted",
};

const ACTION_LABELS: Record<string, string> = {
  BATCH_UPLOADED: "Batch Uploaded",
  BATCH_COMPLETED: "Batch Completed",
  BATCH_FAILED: "Batch Failed",
  VERIFICATION_APPROVED: "Verification Approved",
  VERIFICATION_DECLINED: "Verification Declined",
  CREDENTIAL_REVOKED: "Credential Revoked",
  CLAIM_CREATED: "Claim Created",
  CLAIM_UPDATED: "Claim Updated",
  CLAIM_DELETED: "Claim Deleted",
  LOGIN: "Sign In",
  SETTINGS_UPDATED: "Settings Updated",
};

export default function AuditPage() {
  const [actionFilter, setActionFilter] = React.useState("all");
  const params = actionFilter !== "all" ? { actionType: actionFilter } : undefined;
  const { data, isLoading, refetch, isRefetching } = useAuditLogs(params);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Audit Log</h1>
          <p className="text-muted-foreground mt-0.5">
            A complete record of all actions performed on your institution account.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <p className="font-semibold">No audit events yet</p>
                      <p className="text-sm">
                        As your institution uses VERIDAQ, all actions will be recorded here for compliance and transparency.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[entry.actionType] ?? "muted"}>
                        {ACTION_LABELS[entry.actionType] ?? entry.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{entry.actorType}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.timestamp)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

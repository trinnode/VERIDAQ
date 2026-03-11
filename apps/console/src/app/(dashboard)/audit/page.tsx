"use client";

import * as React from "react";
import { FileText } from "lucide-react";
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
import { useAuditLogs } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

const ACTOR_OPTIONS = [
  { value: "ALL", label: "All Actors" },
  { value: "ADMIN", label: "Admin" },
  { value: "INSTITUTION", label: "Institution" },
  { value: "EMPLOYER", label: "Employer" },
];

const ACTOR_VARIANT: Record<string, "success" | "pending" | "warning" | "muted"> = {
  ADMIN: "warning",
  INSTITUTION: "pending",
  EMPLOYER: "success",
};

export default function AuditPage() {
  const [actorFilter, setActorFilter] = React.useState("ALL");

  const { data, isLoading } = useAuditLogs({
    actorType: actorFilter === "ALL" ? undefined : actorFilter,
  });

  const logs = data?.logs ?? [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Audit Log</h1>
          <p className="text-muted-foreground mt-0.5">Full platform activity history.</p>
        </div>
        <div className="w-48">
          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTOR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
                  {["Action", "Actor", "type", "Target", "Timestamp"].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    {Array(5).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : logs.length === 0 ? (
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <FileText className="w-10 h-10 text-muted-foreground/40" />
            <p className="font-semibold text-navy">No audit entries yet</p>
            <p className="text-sm text-muted-foreground">
              Activity will appear here as institutions and employers use the platform.
            </p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{log.action}</TableCell>
                    <TableCell className="text-sm">{log.actorName}</TableCell>
                    <TableCell>
                      <Badge variant={ACTOR_VARIANT[log.actorType] ?? "muted"}>
                        {log.actorType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.targetType && log.targetId
                        ? `${log.targetType} ${log.targetId.slice(0, 8)}…`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

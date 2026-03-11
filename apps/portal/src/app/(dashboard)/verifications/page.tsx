"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  useVerifications,
  useApproveVerification,
  useDeclineVerification,
} from "@/lib/queries";
import type { VerificationRequest } from "@/lib/api";
import { formatDate, verificationStatusLabel, truncateHash } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "success" | "warning" | "pending" | "danger" | "muted"> = {
  APPROVED: "success",
  VERIFIED: "success",
  DECLINED: "danger",
  REJECTED: "danger",
  AWAITING_INSTITUTION: "warning",
  PENDING: "pending",
};

type ActionType = "approve" | "decline";

function ActionDialog({
  verification,
  action,
  onClose,
}: {
  verification: VerificationRequest;
  action: ActionType;
  onClose: () => void;
}) {
  const approve = useApproveVerification();
  const decline = useDeclineVerification();
  const isApprove = action === "approve";
  const mutation = isApprove ? approve : decline;

  async function handleConfirm() {
    try {
      if (isApprove) {
        await approve.mutateAsync(verification.id);
        toast.success("Verification approved", {
          description: `Request from ${verification.employer?.companyName ?? "employer"} was approved.`,
        });
      } else {
        await decline.mutateAsync({
          requestId: verification.id,
          reason: "Declined by institution",
        });
        toast.success("Verification declined", {
          description: `Request from ${verification.employer?.companyName ?? "employer"} was declined.`,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(`Could not ${action} verification`, { description: msg, duration: Infinity });
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? "Approve Verification Request" : "Decline Verification Request"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? `You are approving the verification request for credential hash ${truncateHash(verification.matricNumberHash)}.`
              : `You are declining the verification request for credential hash ${truncateHash(verification.matricNumberHash)}. This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Requester</span>
            <span className="font-medium">{verification.employer?.companyName ?? "—"}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credential</span>
            <span className="font-mono text-xs">{truncateHash(verification.matricNumberHash)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Requested</span>
            <span>{formatDate(verification.requestedAt)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mutation.isPending}
            variant={isApprove ? "default" : "destructive"}
          >
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
            ) : isApprove ? (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Approve</>
            ) : (
              <><XCircle className="mr-2 h-4 w-4" /> Decline</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VerificationsPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [actionTarget, setActionTarget] = React.useState<{
    verification: VerificationRequest;
    action: ActionType;
  } | null>(null);

  const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
  const { data, isLoading, refetch, isRefetching } = useVerifications(params);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Verification Requests</h1>
          <p className="text-muted-foreground mt-0.5">
            Review and respond to employer verification requests for your credentials.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="AWAITING_INSTITUTION">Awaiting Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="DECLINED">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Requests
            {data?.filter((v) => v.status === "AWAITING_INSTITUTION").length ? (
              <Badge variant="warning">
                {data.filter((v) => v.status === "AWAITING_INSTITUTION").length} need review
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credential Hash</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                      <p className="font-semibold">
                        {statusFilter === "AWAITING_INSTITUTION"
                          ? "All caught up!"
                          : "No verification requests yet"}
                      </p>
                      <p className="text-sm">
                        {statusFilter === "AWAITING_INSTITUTION"
                          ? "There are no pending requests waiting for your review right now."
                          : "When employers request credential verifications, they'll appear here."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((v) => {
                  const label = verificationStatusLabel(v.status);
                  const sv = STATUS_VARIANT[v.status] ?? "muted";
                  const canAct = v.status === "AWAITING_INSTITUTION";
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">{truncateHash(v.matricNumberHash)}</TableCell>
                      <TableCell>{v.employer?.companyName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={sv}>{label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(v.requestedAt)}</TableCell>
                      <TableCell>
                        {canAct ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-success text-success hover:bg-success/10"
                              onClick={() => setActionTarget({ verification: v, action: "approve" })}
                            >
                              <CheckCircle2 className="mr-1 w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-danger text-danger hover:bg-danger/10"
                              onClick={() => setActionTarget({ verification: v, action: "decline" })}
                            >
                              <XCircle className="mr-1 w-3.5 h-3.5" /> Decline
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No action needed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {actionTarget && (
        <ActionDialog
          verification={actionTarget.verification}
          action={actionTarget.action}
          onClose={() => setActionTarget(null)}
        />
      )}
    </div>
  );
}

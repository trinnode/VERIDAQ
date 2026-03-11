"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useInstitution, useApproveInstitution, useSuspendInstitution, useRejectInstitution } from "@/lib/queries";
import { kycStatusLabel, formatDate } from "@/lib/utils";

export default function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useInstitution(id);
  const approveMutation = useApproveInstitution();
  const suspendMutation = useSuspendInstitution();
  const rejectMutation = useRejectInstitution();

  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card><CardContent className="py-24 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-navy/40" /></CardContent></Card>
      </div>
    );
  }

  const institution = data?.institution;

  if (!institution) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Link href="/institutions" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-navy mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <Card><CardContent className="py-16 text-center"><p className="font-semibold text-navy">Institution not found</p></CardContent></Card>
      </div>
    );
  }

  const { label, variant } = kycStatusLabel(institution.kycStatus);
  const isPending = institution.kycStatus === "PENDING";
  const isApproved = institution.kycStatus === "APPROVED";

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(institution.id);
      await refetch();
      toast.success("Institution approved", { description: "They can now upload credentials.", duration: 4000 });
    } catch (err: unknown) {
      toast.error("Approval failed", { description: err instanceof Error ? err.message : "Please try again.", duration: Infinity });
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: institution.id, reason });
      setRejectOpen(false);
      setReason("");
      await refetch();
      toast.success("Institution rejected", { description: "They've been notified by email.", duration: 4000 });
    } catch (err: unknown) {
      toast.error("Rejection failed", { description: err instanceof Error ? err.message : "Please try again.", duration: Infinity });
    }
  };

  const handleSuspend = async () => {
    if (!reason.trim()) return;
    try {
      await suspendMutation.mutateAsync({ id: institution.id, reason });
      setSuspendOpen(false);
      setReason("");
      await refetch();
      toast.success("Institution suspended", { duration: 4000 });
    } catch (err: unknown) {
      toast.error("Suspension failed", { description: err instanceof Error ? err.message : "Please try again.", duration: Infinity });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/institutions" className="text-muted-foreground hover:text-navy">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-navy flex-1">{institution.name}</h1>
        <Badge variant={variant}>{label}</Badge>
      </div>

      {/* KYC Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">KYC Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Official Name" value={institution.name} />
          <Field label="Email" value={institution.email} />
          <Field label="NUC Accreditation No." value={institution.nucAccreditationNumber} />
          {institution.cacRegistrationNumber && (
            <Field label="CAC Reg. No." value={institution.cacRegistrationNumber} />
          )}
          <Field label="Contact Person" value={institution.contactName} />
          <Field label="Official Email Domain" value={institution.officialEmailDomain} />
          {institution.signingWalletAddress && (
            <Field label="Signing Wallet" value={institution.signingWalletAddress} mono />
          )}
          <Field label="Registered" value={formatDate(institution.registeredAt)} />
          <Field label="Subscription Tier" value={institution.subscriptionTier} />
          <Field label="Paymaster Balance" value={`${institution.paymasterBalance} MATIC`} />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-3xl font-bold text-navy">{institution.credentialCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Credentials Issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-3xl font-bold text-navy">{institution.verificationCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Verification Requests</p>
          </CardContent>
        </Card>
      </div>

      {/* KYC notes */}
      {institution.kycNotes && (
        <Card className="border-warning/30">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-medium text-warning uppercase tracking-wide mb-1">Review Notes</p>
            <p className="text-sm">{institution.kycNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Duplicate flag */}
      {institution.rejectionReason && (
        <Card className="border-danger/30">
          <CardContent className="pt-5 pb-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-danger">Rejection Reason</p>
              <p className="text-sm mt-0.5">{institution.rejectionReason}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {institution.documents && institution.documents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Submitted Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {institution.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border hover:border-navy/30 hover:bg-muted/30 transition-all"
              >
                <FileText className="w-4 h-4 text-navy" />
                <span className="flex-1 text-sm">{doc.fileName}</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {isPending && (
          <>
            <Button
              onClick={handleApprove}
              className="bg-success hover:bg-success/90 text-white"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving…</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Approve Institution</>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setReason(""); setRejectOpen(true); }}
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          </>
        )}
        {isApproved && (
          <Button
            variant="outline"
            className="border-danger text-danger hover:bg-danger/5"
            onClick={() => { setReason(""); setSuspendOpen(true); }}
          >
            Suspend Institution
          </Button>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Institution</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Provide a reason. This will be emailed to the institution.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="rejectReason">Reason</Label>
            <Input
              id="rejectReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. NUC accreditation number could not be verified"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!reason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Institution</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The institution will be notified by email and will lose access until reinstated.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="suspendReason">Reason</Label>
            <Input
              id="suspendReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Suspected fraudulent data upload"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!reason.trim() || suspendMutation.isPending}
            >
              {suspendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-medium ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}

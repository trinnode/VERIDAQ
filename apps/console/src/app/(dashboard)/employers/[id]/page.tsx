"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
import { useEmployer, useApproveEmployer, useSuspendEmployer, useRejectEmployer } from "@/lib/queries";
import { kycStatusLabel, formatDate } from "@/lib/utils";

export default function EmployerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useEmployer(id);
  const approveMutation = useApproveEmployer();
  const suspendMutation = useSuspendEmployer();
  const rejectMutation = useRejectEmployer();

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

  const employer = data?.employer;

  if (!employer) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Link href="/employers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-navy mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <Card><CardContent className="py-16 text-center"><p className="font-semibold text-navy">Employer not found</p></CardContent></Card>
      </div>
    );
  }

  const { label, variant } = kycStatusLabel(employer.kycStatus);
  const isPending = employer.kycStatus === "PENDING";
  const isApproved = employer.kycStatus === "APPROVED";

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(employer.id);
      await refetch();
      toast.success("Employer approved", { description: "They can now submit verification requests.", duration: 4000 });
    } catch (err: unknown) {
      toast.error("Approval failed", { description: err instanceof Error ? err.message : "Try again.", duration: Infinity });
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: employer.id, reason });
      setRejectOpen(false);
      setReason("");
      await refetch();
      toast.success("Employer rejected", { description: "They've been notified by email.", duration: 4000 });
    } catch (err: unknown) {
      toast.error("Rejection failed", { description: err instanceof Error ? err.message : "Try again.", duration: Infinity });
    }
  };

  const handleSuspend = async () => {
    if (!reason.trim()) return;
    try {
      await suspendMutation.mutateAsync({ id: employer.id, reason });
      setSuspendOpen(false);
      setReason("");
      await refetch();
      toast.success("Employer suspended", { duration: 4000 });
    } catch (err: unknown) {
      toast.error("Suspension failed", { description: err instanceof Error ? err.message : "Try again.", duration: Infinity });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/employers" className="text-muted-foreground hover:text-navy">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-navy flex-1">{employer.companyName}</h1>
        <Badge variant={variant}>{label}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Company Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: "Company Name", value: employer.companyName },
            { label: "Email", value: employer.email },
            { label: "Contact Person", value: employer.contactName },
            ...(employer.contactPhone ? [{ label: "Contact Phone", value: employer.contactPhone }] : []),
            ...(employer.website ? [{ label: "Website", value: employer.website }] : []),
            ...(employer.address ? [{ label: "Address", value: employer.address }] : []),
            { label: "Registered", value: formatDate(employer.registeredAt) },
            { label: "Subscription", value: employer.subscriptionTier },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{f.label}</p>
              <p className="font-medium text-sm">{f.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-3xl font-bold text-navy">{employer.verificationCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Verifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-3xl font-bold text-navy">{employer.freeVerificationsRemaining}</p>
            <p className="text-xs text-muted-foreground mt-1">Free Verifications Left</p>
          </CardContent>
        </Card>
      </div>

      {employer.rejectionReason && (
        <Card className="border-danger/30">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-medium text-danger uppercase tracking-wide mb-1">Rejection Reason</p>
            <p className="text-sm">{employer.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex flex-wrap gap-3">
        {isPending && (
          <>
            <Button onClick={handleApprove} className="bg-success hover:bg-success/90 text-white" disabled={approveMutation.isPending}>
              {approveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving…</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Approve Employer</>}
            </Button>
            <Button variant="destructive" onClick={() => { setReason(""); setRejectOpen(true); }}>
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          </>
        )}
        {isApproved && (
          <Button variant="outline" className="border-danger text-danger hover:bg-danger/5" onClick={() => { setReason(""); setSuspendOpen(true); }}>
            Suspend Employer
          </Button>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Employer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This reason will be emailed to the applicant.</p>
          <div className="space-y-1.5">
            <Label htmlFor="eRejectReason">Reason</Label>
            <Input id="eRejectReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Company could not be verified with CAC records" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!reason.trim() || rejectMutation.isPending}>
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend Employer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">The employer will be notified and lose access until reinstated.</p>
          <div className="space-y-1.5">
            <Label htmlFor="eSuspendReason">Reason</Label>
            <Input id="eSuspendReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Suspected misuse of verification system" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!reason.trim() || suspendMutation.isPending}>
              {suspendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

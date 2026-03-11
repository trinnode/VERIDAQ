"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerification } from "@/lib/queries";
import { employerApi } from "@/lib/api";
import { formatDate, verificationStatusLabel } from "@/lib/utils";

export default function VerificationDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { data: verification, isLoading } = useVerification(requestId);
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (!verification) return;
    setDownloading(true);
    try {
      const blob = await employerApi.downloadReport(verification.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `veridaq-report-${verification.referenceNumber ?? verification.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded", { duration: 4000 });
    } catch {
      toast.error("Download failed", {
        description: "Could not download the verification report. Please try again.",
        duration: Infinity,
      });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Card>
          <CardContent className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-navy/40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!verification) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-4">
        <Link href="/verifications" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-semibold text-navy">Verification not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              This request may have been removed or the link is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPending =
    verification.status === "AUTO_PROCESSING" || verification.status === "AWAITING_INSTITUTION";
  const isVerified = verification.status === "VERIFIED";
  const isDeclined = verification.status === "NOT_VERIFIED" || verification.status === "DECLINED";
  const { label, variant } = verificationStatusLabel(verification.status);

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/verifications"
          className="text-muted-foreground hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-navy">Verification Detail</h1>
      </div>

      {/* Status card */}
      <Card
        className={`border-2 ${
          isVerified ? "border-success/40" : isDeclined ? "border-danger/40" : "border-warning/30"
        }`}
      >
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          {isPending ? (
            <Clock className="w-14 h-14 text-warning" />
          ) : isVerified ? (
            <CheckCircle2 className="w-14 h-14 text-success" />
          ) : (
            <XCircle className="w-14 h-14 text-danger" />
          )}

          {isPending ? (
            <>
              <p className="text-xl font-bold text-navy">Awaiting Verification</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                The institution is reviewing this claim. This page updates automatically — come back
                soon.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking for updates…
              </div>
            </>
          ) : isVerified ? (
            <>
              <p className="text-2xl font-bold text-success">Verified</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                This credential has been confirmed as genuine by the issuing institution.
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-danger">Not Verified</p>
              {verification.declineReason && (
                <p className="text-sm text-muted-foreground max-w-sm">
                  Reason: {verification.declineReason}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="pt-6 pb-6 space-y-4">
          {/* NEVER display student name, matric, or CGPA */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Institution</p>
              <p className="font-medium">{verification.institutionName ?? verification.institutionId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Credential Type</p>
              <p className="font-medium">{verification.claimLabel ?? verification.claimCode}</p>
            </div>
            {verification.graduationYear && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Graduation Year</p>
                <p className="font-medium">{verification.graduationYear}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Status</p>
              <Badge variant={variant}>{label}</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Submitted</p>
              <p className="font-medium">{formatDate(verification.requestedAt)}</p>
            </div>
            {verification.resolvedAt && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Resolved</p>
                <p className="font-medium">{formatDate(verification.resolvedAt)}</p>
              </div>
            )}
            {verification.referenceNumber && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Reference Number</p>
                <p className="font-mono text-xs">{verification.referenceNumber}</p>
              </div>
            )}
          </div>

          {isVerified && (
            <>
              <Separator />
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-navy hover:bg-navy-light"
              >
                {downloading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading…</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" /> Download Verification Report (PDF)</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

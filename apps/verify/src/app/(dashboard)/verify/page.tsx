"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useProfile,
  useInstitutions,
  useInstitutionClaims,
  useSubmitVerification,
} from "@/lib/queries";
import { employerApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { VerificationRequest } from "@/lib/api";

type VerifyForm = {
  institutionId: string;
  matricNumber: string;
  claimCode: string;
  customClaimLabel?: string;
};

type VerifyStep = "form" | "submitting" | "result";

export default function VerifyPage() {
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: institutions, isLoading: institutionsLoading } = useInstitutions();

  const [step, setStep] = React.useState<VerifyStep>("form");
  const [selectedInstitutionId, setSelectedInstitutionId] = React.useState<string>("");
  const [result, setResult] = React.useState<VerificationRequest | null>(null);
  const [pollInterval, setPollInterval] = React.useState<NodeJS.Timeout | null>(null);

  const { data: claims, isLoading: claimsLoading } = useInstitutionClaims(selectedInstitutionId);
  const submitMutation = useSubmitVerification();

  const remaining = (profileData?.freeVerificationsLimit ?? 5) - (profileData?.freeVerificationsUsed ?? 0);
  const noQuota = remaining === 0 && !profileLoading;
  const lowQuota = remaining === 1 && !profileLoading;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VerifyForm>();

  const watchedClaim = watch("claimCode");
  const isCustomClaim = watchedClaim === "__custom__";

  // Poll for result when pending
  const pollResult = React.useCallback(
    async (requestId: string) => {
      const interval = setInterval(async () => {
        try {
          const data = await employerApi.getVerification(requestId);
          if (data.status !== "AUTO_PROCESSING" && data.status !== "AWAITING_INSTITUTION") {
            clearInterval(interval);
            setPollInterval(null);
            setResult(data);
          }
        } catch {
          // keep polling
        }
      }, 4000);
      setPollInterval(interval);
    },
    []
  );

  // Clear poll on unmount
  React.useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const onSubmit = async (data: VerifyForm) => {
    if (!data.institutionId || !data.matricNumber || !data.claimCode) {
      toast.error("Missing required fields", {
        description: "Institution, matric number, and credential type are required.",
      });
      return;
    }

    if (isCustomClaim && !data.customClaimLabel?.trim()) {
      toast.error("Missing custom credential label", {
        description: "Enter a custom credential label to continue.",
      });
      return;
    }

    setStep("submitting");
    try {
      const claimLabel = isCustomClaim ? data.customClaimLabel : undefined;
      const payload = {
        institutionId: data.institutionId,
        matricNumber: data.matricNumber,
        claimCode: isCustomClaim ? "CUSTOM" : data.claimCode,
        ...(claimLabel ? { customClaimText: claimLabel } : {}),
      };
      const res = await submitMutation.mutateAsync(payload);
      setResult(res);
      if (res.status === "AUTO_PROCESSING" || res.status === "AWAITING_INSTITUTION") {
        pollResult(res.id);
      }
      setStep("result");
      toast.success("Verification request submitted", {
        description: "We'll update you when the result is ready.",
        duration: 4000,
      });
    } catch (err: unknown) {
      setStep("form");
      const message = err instanceof Error ? err.message : "Failed to submit verification";
      toast.error("Submission failed", {
        description: message,
        duration: Infinity,
      });
    }
  };

  const handleReset = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    setResult(null);
    setStep("form");
    setSelectedInstitutionId("");
    reset();
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const blob = await employerApi.downloadReport(result.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `veridaq-report-${result.referenceNumber ?? result.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed", {
        description: "Could not download the report. Please try again.",
        duration: Infinity,
      });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Request Verification</h1>
        <p className="text-muted-foreground mt-0.5">
          Verify a candidate's academic credentials directly from the issuing institution.
        </p>
      </div>

      {/* Hard quota block */}
      {noQuota && (
        <div className="rounded-xl bg-danger/10 border border-danger/30 p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-danger">No verifications remaining</p>
            <p className="text-sm text-danger/80 mt-1">
              Your 3 lifetime free verifications have been exhausted. Please upgrade to continue.
            </p>
            <Button asChild variant="destructive" className="mt-3">
              <Link href="/billing">Upgrade Now</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Soft quota warning */}
      {lowQuota && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            <span className="font-semibold">This is your last free verification.</span> After submitting
            this request, you'll need to upgrade to continue.{" "}
            <Link href="/billing" className="underline">View plans</Link>
          </p>
        </div>
      )}

      {step === "form" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Verification Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Institution */}
              <div className="space-y-1.5">
                <Label htmlFor="institutionId">Institution</Label>
                {institutionsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    onValueChange={(val) => {
                      setSelectedInstitutionId(val);
                      setValue("institutionId", val, { shouldValidate: true });
                      setValue("claimCode", "");
                    }}
                  >
                    <SelectTrigger id="institutionId" className={errors.institutionId ? "border-danger" : ""}>
                      <SelectValue placeholder="Search and select an institution" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions?.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.institutionId && (
                  <p className="text-xs text-danger">{errors.institutionId.message}</p>
                )}
              </div>

              {/* Matric number */}
              <div className="space-y-1.5">
                <Label htmlFor="matricNumber">Matric / Student ID</Label>
                <Input
                  id="matricNumber"
                  placeholder="e.g. 2019/1234"
                  {...register("matricNumber")}
                  className={errors.matricNumber ? "border-danger" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the student ID exactly as it appears in the institution's records.
                </p>
                {errors.matricNumber && (
                  <p className="text-xs text-danger">{errors.matricNumber.message}</p>
                )}
              </div>

              {/* Claim selection */}
              {selectedInstitutionId && (
                <div className="space-y-1.5">
                  <Label>Credential Type</Label>
                  {claimsLoading ? (
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                    </div>
                  ) : claims && claims.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {claims.map((claim) => {
                        const isSelected = watchedClaim === claim.claimCode;
                        return (
                          <button
                            key={claim.claimCode}
                            type="button"
                            onClick={() => setValue("claimCode", claim.claimCode, { shouldValidate: true })}
                            className={`rounded-lg border p-3 text-left transition-all ${
                              isSelected
                                ? "border-navy bg-navy/8 ring-1 ring-navy"
                                : "border-border hover:border-navy/40"
                            }`}
                          >
                            <p className="text-sm font-semibold text-navy">{claim.claimLabel}</p>
                            {claim.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {claim.description}
                              </p>
                            )}
                          </button>
                        );
                      })}
                      {/* Custom claim — always last */}
                      <button
                        type="button"
                        onClick={() => setValue("claimCode", "__custom__", { shouldValidate: true })}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          isCustomClaim
                            ? "border-navy bg-navy/8 ring-1 ring-navy"
                            : "border-border hover:border-navy/40"
                        }`}
                      >
                        <p className="text-sm font-semibold text-navy">Custom Claim</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Specify a credential type not listed above.
                        </p>
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-3 text-center">
                      This institution hasn't published any credential types yet.
                    </p>
                  )}
                  {errors.claimCode && (
                    <p className="text-xs text-danger">{errors.claimCode.message}</p>
                  )}
                </div>
              )}

              {/* Custom claim label */}
              {isCustomClaim && (
                <div className="space-y-1.5">
                  <Label htmlFor="customClaimLabel">Describe the Credential</Label>
                  <Input
                    id="customClaimLabel"
                    placeholder="e.g. Certificate of IT Internship"
                    {...register("customClaimLabel")}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-navy hover:bg-navy-light"
                disabled={noQuota || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <><ShieldCheck className="mr-2 h-4 w-4" /> Submit Verification Request</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "submitting" && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-navy" />
            <p className="font-semibold text-navy">Submitting your request…</p>
            <p className="text-sm text-muted-foreground">This will only take a moment.</p>
          </CardContent>
        </Card>
      )}

      {step === "result" && result && (
        <VerificationResult result={result} onNewRequest={handleReset} onDownload={handleDownload} />
      )}
    </div>
  );
}

// ─── Result component ────────────────────────────────────────────────────────

interface ResultProps {
  result: VerificationRequest;
  onNewRequest: () => void;
  onDownload: () => void;
}

function VerificationResult({ result, onNewRequest, onDownload }: ResultProps) {
  const isPending =
    result.status === "AUTO_PROCESSING" || result.status === "AWAITING_INSTITUTION";
  const isVerified = result.status === "VERIFIED";
  const isDeclined = result.status === "NOT_VERIFIED" || result.status === "DECLINED";

  return (
    <Card className={`border-2 ${isVerified ? "border-success/40" : isDeclined ? "border-danger/40" : "border-warning/30"}`}>
      <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-6">
        {isPending ? (
          <Clock className="w-16 h-16 text-warning" />
        ) : isVerified ? (
          <CheckCircle2 className="w-16 h-16 text-success" />
        ) : (
          <XCircle className="w-16 h-16 text-danger" />
        )}

        <div>
          {isPending ? (
            <>
              <p className="text-xl font-bold text-navy">Awaiting Verification</p>
              <p className="text-muted-foreground mt-1 text-sm">
                The institution needs to review this claim manually. We'll notify you when it's done.
              </p>
            </>
          ) : isVerified ? (
            <>
              <p className="text-2xl font-bold text-success">Verified</p>
              <p className="text-muted-foreground mt-1 text-sm">
                This credential has been confirmed by the issuing institution.
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-danger">Not Verified</p>
              <p className="text-muted-foreground mt-1 text-sm">
                The institution could not verify this credential.
                {result.declineReason ? ` Reason: ${result.declineReason}` : ""}
              </p>
            </>
          )}
        </div>

        <Separator />

        {/* Verification details — NEVER show student name, matric, or CGPA */}
        <div className="w-full grid grid-cols-2 gap-3 text-left text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Institution</p>
            <p className="font-medium">{result.institutionName ?? result.institutionId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Credential Type</p>
            <p className="font-medium">{result.claimLabel ?? result.claimCode}</p>
          </div>
          {result.graduationYear && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Graduation Year</p>
              <p className="font-medium">{result.graduationYear}</p>
            </div>
          )}
          {result.referenceNumber && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Reference No.</p>
              <p className="font-medium font-mono text-xs">{result.referenceNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Submitted</p>
            <p className="font-medium">{formatDate(result.requestedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <Badge
              variant={
                isVerified ? "success" : isDeclined ? "danger" : "pending"
              }
            >
              {isVerified ? "Verified" : isDeclined ? "Not Verified" : "Awaiting Review"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {isVerified && (
            <Button
              onClick={onDownload}
              className="flex-1 bg-navy hover:bg-navy-light"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          )}
          <Button onClick={onNewRequest} variant="outline" className="flex-1">
            New Verification Request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  CloudUpload,
  FileSpreadsheet,
  Info,
  Loader2,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useClaims, useUploadBatch } from "@/lib/queries";
import { usePortalStore } from "@/store";
import { api } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

// ─── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  "Select Claim Type",
  "Upload File",
  "Review Columns",
  "Confirm",
  "Submitting",
  "Done",
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                  done
                    ? "bg-success text-white"
                    : active
                    ? "bg-navy text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`mt-1 text-[11px] hidden sm:block text-center max-w-[72px] leading-tight ${
                  active ? "text-navy font-semibold" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 mb-5 transition-colors ${
                  i < current ? "bg-success" : "bg-muted"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();
  const token = usePortalStore((s) => s.token);
  const institution = usePortalStore((s) => s.institution);
  const { data: claimsData } = useClaims();
  const uploadBatch = useUploadBatch();

  const [step, setStep] = React.useState(0);
  const [selectedClaimId, setSelectedClaimId] = React.useState("");
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [batchId, setBatchId] = React.useState<string | null>(null);
  const [confirmInput, setConfirmInput] = React.useState("");
  const [dragging, setDragging] = React.useState(false);

  const claims = claimsData ?? [];
  const selectedClaim = claims.find((c) => c.id === selectedClaimId);

  // ── Step 0: pick claim type ──────────────────────────────────────────────
  function handleStep0Next() {
    if (!selectedClaimId) {
      toast.error("Please select a claim type first");
      return;
    }
    setStep(1);
  }

  // ── Step 1: upload file ──────────────────────────────────────────────────
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  }

  function validateAndSetFile(file: File) {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(csv|xlsx)$/i)) {
      toast.error("Invalid file type", { description: "Only .xlsx or .csv files are accepted." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 10 MB." });
      return;
    }
    setUploadedFile(file);
  }

  async function handleDownloadTemplate() {
    if (!token || !selectedClaimId) return;
    try {
      const response = await api.downloadTemplate(token);
      if (!response.ok) {
        throw new Error("Template download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `veridaq-template-${selectedClaim?.claimLabel ?? "batch"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download template");
    }
  }

  // ── Step 2: review ───────────────────────────────────────────────────────
  // Step 3: confirm by typing institution name ──────────────────────────────
  const confirmMatch = confirmInput.trim() === (institution?.name ?? "").trim();

  // ── Step 4: submit ────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!uploadedFile || !selectedClaimId) return;
    setStep(4);
    try {
      const batch = await uploadBatch.mutateAsync(uploadedFile);
      setBatchId(batch.batchId);
      setStep(5);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error("Batch upload failed", { description: msg, duration: Infinity });
      setStep(3);
    }
  }

  // ── Render by step ────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Upload Credentials</h1>
        <p className="text-muted-foreground mt-0.5">
          Issue a new batch of verifiable credentials in a few steps.
        </p>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 0: Select Claim Type ─────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Select a Claim Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {claims.length === 0 ? (
              <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 text-sm text-warning flex gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No claim types defined yet</p>
                  <p className="mt-0.5 text-warning/80">
                    Go to <strong>Claims</strong> and define at least one claim type before uploading.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {claims.map((claim) => (
                  <button
                    key={claim.id}
                    type="button"
                    onClick={() => setSelectedClaimId(claim.id)}
                    className={`flex items-center justify-between p-4 rounded-lg border text-left transition-colors ${
                      selectedClaimId === claim.id
                        ? "border-navy bg-navy/5"
                        : "border-border hover:border-navy/40 hover:bg-muted/40"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-navy">{claim.claimLabel}</p>
                      {claim.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{claim.description}</p>
                      )}
                    </div>
                    {selectedClaimId === claim.id && (
                      <CheckCircle2 className="w-5 h-5 text-navy shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleStep0Next} disabled={!selectedClaimId}>
                Next <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Upload File ───────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Upload Spreadsheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Claim type:{" "}
                  <span className="font-semibold text-navy">{selectedClaim?.claimLabel}</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <FileSpreadsheet className="mr-2 w-4 h-4" />
                Download Template
              </Button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 transition-colors cursor-pointer ${
                dragging ? "border-navy bg-navy/5" : "border-border hover:border-navy/50 hover:bg-muted/30"
              }`}
              onClick={() => document.getElementById("batch-file-input")?.click()}
            >
              <input
                id="batch-file-input"
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileInput}
              />
              <CloudUpload className="w-10 h-10 text-muted-foreground mb-3" />
              {uploadedFile ? (
                <>
                  <p className="font-semibold text-navy">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(uploadedFile.size)} — click to replace
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-sm">Drag & drop or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">.xlsx or .csv, max 10 MB</p>
                </>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="mr-1 w-4 h-4" /> Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={!uploadedFile}>
                Next <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Review Columns ────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Review File Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File name</span>
                <span className="font-medium">{uploadedFile?.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File size</span>
                <span className="font-medium">{uploadedFile ? formatFileSize(uploadedFile.size) : "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Claim type</span>
                <span className="font-medium">{selectedClaim?.claimLabel}</span>
              </div>
            </div>

            <div className="rounded-lg bg-pending/10 border border-pending/30 p-4 text-sm text-pending flex gap-3">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Make sure your spreadsheet columns match the expected fields above. Mismatched
                columns will cause the batch to fail validation.
              </p>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 w-4 h-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Confirm ───────────────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4 — Confirm Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              You are about to submit a credential batch for{" "}
              <strong className="text-navy">{selectedClaim?.claimLabel}</strong>. This action will
              process the file and issue credentials on-chain. It cannot be undone.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-name">
                Type your institution name to confirm:{" "}
                <span className="font-bold text-navy">{institution?.name}</span>
              </Label>
              <Input
                id="confirm-name"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={institution?.name}
                autoComplete="off"
                className={confirmInput && !confirmMatch ? "border-danger focus-visible:ring-danger" : ""}
              />
              {confirmInput && !confirmMatch && (
                <p className="text-xs text-danger">Institution name does not match</p>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 w-4 h-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!confirmMatch || uploadBatch.isPending}
                className="bg-navy hover:bg-navy-light"
              >
                Submit Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Submitting ────────────────────────────────────────── */}
      {step === 4 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-12 h-12 text-navy animate-spin" />
            <p className="text-lg font-semibold text-navy">Uploading batch…</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Your file is being uploaded and queued for processing. Please don't close this tab.
            </p>
            <Progress value={undefined} className="w-48 mt-2" />
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Done ─────────────────────────────────────────────── */}
      {step === 5 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/15">
              <FileCheck2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-xl font-bold text-navy">Batch Submitted!</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your credential batch has been queued for on-chain issuance. You can track its
              progress in the Batches section.
            </p>
            {batchId && (
              <Badge variant="muted" className="font-mono text-xs">
                Batch ID: {batchId}
              </Badge>
            )}
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => {
                setStep(0);
                setSelectedClaimId("");
                setUploadedFile(null);
                setBatchId(null);
                setConfirmInput("");
              }}>
                Upload Another
              </Button>
              <Button onClick={() => router.push(batchId ? `/batches/${batchId}` : "/batches")}>
                View Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

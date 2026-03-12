"use client";

import * as React from "react";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Badge } from "@/components/portal/ui/badge";
import { Skeleton } from "@/components/portal/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/portal/ui/dialog";
import {
  useClaims,
  useCreateClaim,
  useUpdateClaim,
  useDeleteClaim,
} from "@/lib/portal/queries";
import type { ClaimDefinition } from "@/lib/portal/api";

// ─── Schema ───────────────────────────────────────────────────────────────────

const claimSchema = z.object({
  claimLabel: z.string().min(2, "Label must be at least 2 characters"),
  claimType: z.enum(["AUTO", "MANUAL"]),
  description: z.string().optional(),
});

type ClaimValues = z.infer<typeof claimSchema>;

const claimFormResolver: Resolver<ClaimValues> = async (values) => {
  const parsed = claimSchema.safeParse(values);

  if (parsed.success) {
    return {
      values: parsed.data,
      errors: {},
    };
  }

  const errors: FieldErrors<ClaimValues> = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      (errors as Record<string, { type: string; message: string }>)[field] = {
        type: issue.code,
        message: issue.message,
      };
    }
  }

  return {
    values: {},
    errors,
  };
};

// ─── Claim Form Dialog ────────────────────────────────────────────────────────

function ClaimFormDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: ClaimDefinition;
}) {
  const isEdit = !!existing;
  const createClaim = useCreateClaim();
  const updateClaim = useUpdateClaim();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClaimValues>({
    resolver: claimFormResolver,
    defaultValues: {
      claimLabel: existing?.claimLabel ?? "",
      claimType: existing?.claimType ?? "AUTO",
      description: existing?.description ?? "",
    },
  });

  React.useEffect(() => {
    reset({
      claimLabel: existing?.claimLabel ?? "",
      claimType: existing?.claimType ?? "AUTO",
      description: existing?.description ?? "",
    });
  }, [existing, reset]);

  const claimTypeValue = watch("claimType");

  async function onSubmit(values: ClaimValues) {
    try {
      if (isEdit && existing) {
        await updateClaim.mutateAsync({
          claimId: existing.id,
          data: {
            claimLabel: values.claimLabel,
            claimType: values.claimType,
            description: values.description,
          },
        });
        toast.success("Claim type updated", { description: `"${values.claimLabel}" was saved.` });
      } else {
        await createClaim.mutateAsync({
          claimLabel: values.claimLabel,
          claimType: values.claimType,
          description: values.description,
        });
        toast.success("Claim type created", { description: `"${values.claimLabel}" is now available for uploading.` });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(isEdit ? "Update failed" : "Create failed", { description: msg, duration: Infinity });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Claim Type" : "New Claim Type"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the claim definition details."
              : "Define a new verifiable claim employers can request."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="claim-label">Claim Label *</Label>
            <Input id="claim-label" placeholder="e.g. First Class Honours" {...register("claimLabel")} />
            {errors.claimLabel && <p className="text-xs text-danger">{errors.claimLabel.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="claim-type">Claim Type *</Label>
            <Select
              value={claimTypeValue}
              onValueChange={(value) =>
                setValue("claimType", value as "AUTO" | "MANUAL", { shouldValidate: true })
              }
            >
              <SelectTrigger id="claim-type">
                <SelectValue placeholder="Select claim type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">Auto</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="claim-desc">Description</Label>
            <Input id="claim-desc" placeholder="Optional description" {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Claim Type"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteDialog({
  claim,
  onClose,
}: {
  claim: ClaimDefinition | null;
  onClose: () => void;
}) {
  const deleteClaim = useDeleteClaim();

  async function handleDelete() {
    if (!claim) return;
    try {
      await deleteClaim.mutateAsync(claim.id);
      toast.success("Claim type deleted", { description: `"${claim.claimLabel}" was removed.` });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error("Could not delete claim type", { description: msg, duration: Infinity });
    }
  }

  return (
    <Dialog open={!!claim} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Claim Type</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <strong className="text-navy">{claim?.claimLabel}</strong>? This cannot be undone,
            and any batches using this claim type may be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteClaim.isPending}
          >
            {deleteClaim.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…</>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClaimsPage() {
  const { data, isLoading } = useClaims();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editClaim, setEditClaim] = React.useState<ClaimDefinition | undefined>();
  const [deletingClaim, setDeletingClaim] = React.useState<ClaimDefinition | null>(null);

  function openCreate() {
    setEditClaim(undefined);
    setFormOpen(true);
  }

  function openEdit(claim: ClaimDefinition) {
    setEditClaim(claim);
    setFormOpen(true);
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Claim Types</h1>
          <p className="text-muted-foreground mt-0.5">
            Define the credential schemas your institution issues.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 w-4 h-4" /> New Claim Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Claim Types</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <p className="text-base font-semibold">You haven't defined any claim types yet</p>
              <p className="text-sm text-center max-w-xs">
                Claim types define what fields your credential spreadsheets should contain. Create
                one to get started.
              </p>
              <Button onClick={openCreate} className="mt-2">
                <Plus className="mr-2 w-4 h-4" /> Create your first claim type
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {data.map((claim) => (
                <li
                  key={claim.id}
                  className="flex items-start justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-semibold text-navy">{claim.claimLabel}</p>
                    {claim.description && (
                      <p className="text-sm text-muted-foreground">{claim.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={claim.claimType === "AUTO" ? "pending" : "warning"} className="text-xs">
                        {claim.claimType}
                      </Badge>
                      <Badge variant={claim.isActive ? "success" : "muted"} className="text-xs">
                        {claim.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(claim)}
                      aria-label="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger hover:text-danger hover:bg-danger/10"
                      onClick={() => setDeletingClaim(claim)}
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ClaimFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditClaim(undefined); }}
        existing={editClaim}
      />

      <DeleteDialog
        claim={deletingClaim}
        onClose={() => setDeletingClaim(null)}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { Loader2, AlertTriangle, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSponsoredPoolBalance } from "@/lib/queries";
import { adminApi } from "@/lib/api";

type DepositForm = {
  amount: string;
};

export default function ConsoleBillingPage() {
  const { data, isLoading, refetch } = useSponsoredPoolBalance();
  const [depositOpen, setDepositOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepositForm>();

  const LOW_THRESHOLD = 10;
  const balance = parseFloat(data?.balance ?? "0");
  const isLow = balance < LOW_THRESHOLD;

  const onDeposit = async (formData: DepositForm) => {
    try {
      await adminApi.depositToSponsoredPool(formData.amount);
      await refetch();
      reset();
      setDepositOpen(false);
      toast.success("Deposit successful", {
        description: `${formData.amount} MATIC added to the sponsored pool.`,
        duration: 4000,
      });
    } catch (err: unknown) {
      toast.error("Deposit failed", {
        description: err instanceof Error ? err.message : "Please try again.",
        duration: Infinity,
      });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Billing</h1>
        <p className="text-muted-foreground mt-0.5">Manage the platform-sponsored gas pool.</p>
      </div>

      {isLow && !isLoading && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            <span className="font-semibold">Sponsored pool balance is low.</span> Free-tier institutions
            may be unable to submit batches. Top up the pool to avoid interruptions.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Platform-Sponsored Pool</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-40" />
          ) : (
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-4xl font-bold ${isLow ? "text-warning" : "text-navy"}`}>
                  {data?.balance ?? "0"} {data?.currency ?? "MATIC"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Used to cover gas costs for free-tier institutions doing batches under 1000 students.
                </p>
              </div>
              <Button
                onClick={() => setDepositOpen(true)}
                className="bg-navy hover:bg-navy-light"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Top Up
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How the sponsored pool works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>When a free-tier institution submits a batch of fewer than 1000 students, the platform covers the gas cost from this pool rather than deducting from the institution's own Paymaster balance.</p>
          <p>Paid-tier institutions and any batches above the free threshold always draw from the institution's own balance.</p>
          <p>Top up this pool by depositing MATIC. The deposit call signs and sends the transaction directly to the Paymaster contract on Base Sepolia.</p>
        </CardContent>
      </Card>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up Sponsored Pool</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onDeposit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (MATIC)</Label>
              <Input
                id="amount"
                placeholder="e.g. 100"
                {...register("amount", {
                  required: "Enter an amount",
                  validate: (value) => {
                    const parsed = Number(value);
                    return (!isNaN(parsed) && parsed > 0) || "Must be a positive number";
                  },
                })}
                className={errors.amount ? "border-danger" : ""}
              />
              {errors.amount && (
                <p className="text-xs text-danger">{errors.amount.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-navy hover:bg-navy-light" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</> : "Confirm Deposit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

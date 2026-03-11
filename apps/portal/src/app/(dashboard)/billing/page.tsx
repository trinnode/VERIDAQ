"use client";

import * as React from "react";
import { RefreshCw, Wallet, Zap, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymasterBalance } from "@/lib/queries";

export default function BillingPage() {
  const { data, isLoading, refetch, isRefetching } = usePaymasterBalance();

  const balance = data?.balanceMatic ? Number(data.balanceMatic) : null;
  const lowBalance = balance !== null && balance < 100;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Billing & Paymaster</h1>
          <p className="text-muted-foreground mt-0.5">
            Monitor your gas sponsorship balance for on-chain credential operations.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`mr-2 w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Balance card */}
      <Card className={lowBalance ? "border-warning" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-navy/8">
              <Wallet className="w-5 h-5 text-navy" />
            </div>
            <div>
              <CardTitle>Paymaster Balance</CardTitle>
              <CardDescription>MATIC balance used to sponsor gas for credential issuance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-48" />
          ) : (
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-navy tabular-nums">
                {balance !== null ? balance.toLocaleString() : "—"}
              </span>
              <span className="text-lg text-muted-foreground mb-1">MATIC</span>
              {lowBalance && (
                <Badge variant="warning" className="mb-1">Low balance</Badge>
              )}
            </div>
          )}
          {lowBalance && (
            <div className="mt-4 rounded-lg bg-warning/10 border border-warning/30 p-4 text-sm text-warning flex gap-3">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Your paymaster balance is running low</p>
                <p className="text-warning/80 mt-0.5">
                  Contact your VERIDAQ administrator to top up your paymaster before you run
                  out of gas sponsorship. Batches may fail if the balance reaches zero.
                </p>
              </div>
            </div>
          )}
          <div className="mt-4 rounded-lg bg-muted p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Balance (wei)</span>
            <span className="font-mono text-xs">{data?.balanceWei ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-navy/8">
              <Zap className="w-5 h-5 text-navy" />
            </div>
            <CardTitle>How Paymaster Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            VERIDAQ uses account abstraction and a <strong className="text-navy">paymaster</strong> to
            sponsor the gas fees required to issue credentials on-chain. Instead of managing a
            private key wallet, your institution's VDQ balance is used automatically every time
            a credential batch is submitted.
          </p>
          <p>
            Each credential record in a batch consumes a small amount of VDQ to cover the blockchain
            transaction cost. Larger batches consume proportionally more balance.
          </p>
          <p>
            To top up your paymaster balance, contact your VERIDAQ platform administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

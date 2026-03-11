"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Users, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useEmployers } from "@/lib/queries";
import { kycStatusLabel, formatDateShort } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REJECTED", label: "Rejected" },
];

export default function EmployersPage() {
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const params = {
    status: statusFilter === "ALL" ? undefined : statusFilter,
    q: debouncedSearch || undefined,
  };

  const { data, isLoading } = useEmployers(params);
  const employers = data?.employers ?? [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Employers</h1>
        <p className="text-muted-foreground mt-0.5">
          Review employer KYC applications and manage account status.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name or email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
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
                  {["Company", "Contact", "Email", "Registered", "Verifications", "Status", ""].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : employers.length === 0 ? (
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <Users className="w-10 h-10 text-muted-foreground/40" />
            <p className="font-semibold text-navy">No employers found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter !== "ALL" ? "Try changing the status filter." : "No employers have registered yet."}
            </p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Verifications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employers.map((emp) => {
                  const { label, variant } = kycStatusLabel(emp.kycStatus);
                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-sm">{emp.companyName}</TableCell>
                      <TableCell className="text-sm">{emp.contactName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateShort(emp.registeredAt)}</TableCell>
                      <TableCell className="text-sm">{emp.verificationCount}</TableCell>
                      <TableCell><Badge variant={variant}>{label}</Badge></TableCell>
                      <TableCell>
                        <Link href={`/employers/${emp.id}`} className="flex items-center gap-1 text-xs text-navy hover:underline whitespace-nowrap">
                          Review <ExternalLink className="w-3 h-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

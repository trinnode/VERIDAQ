"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Building2, ExternalLink } from "lucide-react";
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
import { useInstitutions } from "@/lib/queries";
import { kycStatusLabel, formatDateShort } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REJECTED", label: "Rejected" },
];

export default function InstitutionsPage() {
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const params = {
    status: statusFilter === "ALL" ? undefined : statusFilter,
    q: debouncedSearch || undefined,
  };

  const { data, isLoading } = useInstitutions(params);
  const institutions = data?.institutions ?? [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Institutions</h1>
        <p className="text-muted-foreground mt-0.5">
          Review institution KYC applications and manage account status.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or registration number…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
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
                  <TableHead>Institution</TableHead>
                  <TableHead>NUC Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : institutions.length === 0 ? (
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <Building2 className="w-10 h-10 text-muted-foreground/40" />
            <p className="font-semibold text-navy">No institutions found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter !== "ALL"
                ? "Try changing the status filter."
                : "No institutions have registered yet."}
            </p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead>NUC Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.map((inst) => {
                  const { label, variant } = kycStatusLabel(inst.kycStatus);
                  return (
                    <TableRow key={inst.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm">{inst.name}</p>
                          <p className="text-xs text-muted-foreground">{inst.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{inst.nucAccreditationNumber}</TableCell>
                      <TableCell className="text-sm">{inst.contactName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateShort(inst.registeredAt)}</TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/institutions/${inst.id}`}
                          className="flex items-center gap-1 text-xs text-navy hover:underline whitespace-nowrap"
                        >
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

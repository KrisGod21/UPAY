"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Select, Button } from "@/components/ui";
import { LEVEL_LABELS } from "@/lib/utils";

export function StudentFilters({ centres }: { centres: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/students?${next.toString()}`);
  };

  const hasFilters = ["q", "level", "centre"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search by name or code"
          className="pl-9"
        />
      </div>

      <Select
        value={params.get("centre") ?? ""}
        onChange={(e) => set("centre", e.target.value)}
        className="w-auto min-w-44"
      >
        <option value="">All centres</option>
        {centres.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </Select>

      <Select
        value={params.get("level") ?? ""}
        onChange={(e) => set("level", e.target.value)}
        className="w-auto min-w-40"
      >
        <option value="">All levels</option>
        {Object.entries(LEVEL_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={() => router.replace("/students")}>
          <X /> Clear
        </Button>
      ) : null}
    </div>
  );
}

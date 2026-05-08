"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getVendors } from "@/lib/api";
import type { Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: number | null;
  onChange: (id: number) => void;
  error?: string;
}

export default function VendorCombobox({ value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getVendors({ limit: 100 })
      .then((res) => setVendors(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = vendors.find((v) => v.id === value);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-white/70">Vendor *</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
              "bg-white/5 border-white/10 text-white",
              "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
              error && "border-red-500/60"
            )}
          >
            <span className={cn(!selected && "text-white/40")}>
              {loading ? "Loading…" : selected ? selected.name : "Select vendor…"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-white/40" />
          </button>
        </PopoverTrigger>
        <PopoverContent style={{ width: "var(--radix-popover-trigger-width)" }}>
          <Command>
            <CommandInput placeholder="Search vendors…" />
            <CommandList>
              <CommandEmpty>No vendors found.</CommandEmpty>
              <CommandGroup>
                {vendors.map((v) => (
                  <CommandItem
                    key={v.id}
                    value={v.name}
                    onSelect={() => {
                      onChange(v.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4 shrink-0", value === v.id ? "opacity-100" : "opacity-0")}
                    />
                    {v.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

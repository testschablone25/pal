"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, MapPin, Package } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  current_location: string | null;
}

interface InventoryAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectItem: (item: InventoryItem) => void;
  placeholder?: string;
  excludeIds?: string[];
  className?: string;
}

const categoryLabels: Record<string, string> = {
  dj_audio: "DJ & Audio",
  lighting: "Lighting",
  pa_sound: "PA & Sound",
  infrastructure: "Infrastructure",
  venue_misc: "Venue & Misc",
};

export function InventoryAutocomplete({
  value,
  onChange,
  onSelectItem,
  placeholder = "Equipment name",
  excludeIds = [],
  className,
}: InventoryAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Trigger search when input changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }

    // Debounce 250ms to avoid excessive fetches
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("search", trimmed);
        params.append("limit", "8");

        const response = await fetch(`/api/items?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          const filtered = (data.items || []).filter(
            (item: InventoryItem) => !excludeIds.includes(item.id)
          );
          setItems(filtered);
          setOpen(filtered.length > 0);
        }
      } catch {
        // Silently fail — user can still type freely
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, excludeIds]);

  const handleSelect = (item: InventoryItem) => {
    onSelectItem(item);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (items.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] p-0 bg-zinc-900 border-zinc-700"
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              </div>
            )}
            {!loading && items.length === 0 && (
              <CommandEmpty>No matching inventory items</CommandEmpty>
            )}
            {!loading && (
              <CommandGroup heading="Inventory Items">
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.name}
                    onSelect={() => handleSelect(item)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                          <span className="text-white text-sm font-medium truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-5.5">
                          <Badge
                            variant="outline"
                            className="border-zinc-700 text-zinc-400 text-[10px] py-0"
                          >
                            {categoryLabels[item.category] || item.category}
                          </Badge>
                          {(item.brand || item.model) && (
                            <span className="text-[11px] text-zinc-500 truncate">
                              {[item.brand, item.model]
                                .filter(Boolean)
                                .join(" / ")}
                            </span>
                          )}
                        </div>
                        {item.current_location && (
                          <p className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1 ml-5.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {item.current_location}
                          </p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

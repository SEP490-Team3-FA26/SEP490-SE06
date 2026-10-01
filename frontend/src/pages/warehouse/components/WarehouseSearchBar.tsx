import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { inventoryMapService } from "../../../services/inventory/inventoryMap.service";

interface WarehouseSearchBarProps {
  onSelect: (targetId: string) => void;
}

export function WarehouseSearchBar({ onSelect }: WarehouseSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const data = await inventoryMapService.warehouseSearch(searchTerm);
      setResults(data || []);
      setIsOpen(true);
    } catch (error) {
      console.error("Failed to search warehouse", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    onSelect(item.targetId);
    setQuery(item.name);
    setIsOpen(false);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onSelect(""); // Clear highlight
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-slate-400" size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm thuốc (Tên, SKU)..."
          className="w-72 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400 shadow-sm"
        />
        {loading && (
          <Loader2 className="absolute right-3 animate-spin text-sky-500" size={14} />
        )}
        {!loading && query && (
          <button onClick={clearSearch} className="absolute right-3 text-slate-400 hover:text-slate-600">
            &times;
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {results.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                Không tìm thấy thuốc hoặc thuốc chưa có vị trí kệ.
              </div>
            ) : (
              <ul>
                {results.map((item, idx) => (
                  <li
                    key={`${item.medicineId}-${item.targetId}-${idx}`}
                    onClick={() => handleSelect(item)}
                    className="p-3 hover:bg-sky-50/60 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">SKU: {item.sku}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-sky-700 bg-sky-50 w-fit px-2.5 py-1 rounded-lg border border-sky-200/70 font-medium">
                      <MapPin size={12} className="text-sky-500" />
                      <span>
                        Khu {item.location.zone} &middot; Kệ {item.location.rack} &middot; Tầng {item.location.shelf}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

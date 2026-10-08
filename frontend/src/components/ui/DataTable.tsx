import React, { useState, useCallback, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Column definition for DataTable. */
interface ColumnDef<T> {
  /** Property key used as a stable React key (does not need to match a field on T) */
  key: string;
  /** Column header label */
  header: string;
  /** Optional fixed width, e.g. "120px" or "10%" */
  width?: string;
  /** Enables click-to-sort on this column */
  sortable?: boolean;
  /** Custom cell renderer; receives the full row object */
  render?: (item: T) => ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T extends { id?: string; _id?: string }> {
  /** Row data */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Shows skeleton loading state when true */
  loading?: boolean;
  /** Message shown when data is empty */
  emptyMessage?: string;
  /** Called when a non-header row is clicked */
  onRowClick?: (item: T) => void;
  /** Enables row selection checkboxes */
  selectable?: boolean;
  /** Called with the current set of selected rows whenever selection changes */
  onSelect?: (selected: T[]) => void;
  /** Additional CSS classes for the root wrapper */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRowId<T extends { id?: string; _id?: string }>(item: T, index: number): string {
  return item._id ?? item.id ?? String(index);
}

function sortData<T>(items: T[], sortState: SortState, columns: ColumnDef<T>[]): T[] {
  if (!sortState.direction) return items;

  const col = columns.find((c) => c.key === sortState.key);
  if (!col) return items;

  return [...items].sort((a, b) => {
    // Use the `key` as a property accessor; falls back to '' if not a field name
    const aVal = String((a as Record<string, unknown>)[sortState.key] ?? '');
    const bVal = String((b as Record<string, unknown>)[sortState.key] ?? '');

    const cmp = aVal.localeCompare(bVal, 'vi', { numeric: true, sensitivity: 'base' });
    return sortState.direction === 'asc' ? cmp : -cmp;
  });
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-slate-200/80 animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ column, sortState }: { column: ColumnDef<unknown>; sortState: SortState }) {
  if (sortState.key !== column.key || !sortState.direction) {
    return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />;
  }
  return sortState.direction === 'asc' ? (
    <ChevronUp className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DataTable is a generic, sortable table with:
 * - Client-side single-column sorting
 * - Optional row selection via checkboxes
 * - Skeleton loading state (3 animated rows)
 * - Empty state with icon and message
 * - Glassmorphism row hover and sticky header
 *
 * @template T — Row data shape; must have at least `id` or `_id`.
 */
function DataTable<T extends { id?: string; _id?: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available.',
  onRowClick,
  selectable = false,
  onSelect,
  className = '',
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<SortState>({ key: '', direction: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = useCallback((colKey: string) => {
    setSortState((prev) => {
      if (prev.key !== colKey) return { key: colKey, direction: 'asc' };
      if (prev.direction === 'asc') return { key: colKey, direction: 'desc' };
      return { key: '', direction: null };
    });
  }, []);

  const sortedData = sortData(data, sortState, columns as ColumnDef<T>[]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const isAllSelected = data.length > 0 && selectedIds.size === data.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < data.length;

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      onSelect?.([]);
    } else {
      const ids = new Set(data.map((item, i) => getRowId(item, i)));
      setSelectedIds(ids);
      onSelect?.(data);
    }
  };

  const toggleRow = (item: T, rowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      const selectedItems = data.filter((d, i) => next.has(getRowId(d, i)));
      onSelect?.(selectedItems);
      return next;
    });
  };

  // ── Total column count (includes selection col) ────────────────────────────
  const totalCols = selectable ? columns.length + 1 : columns.length;

  return (
    <div
      className={[
        'overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm',
        className,
      ].join(' ')}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {/* ── Column widths ───────────────────────────────────────────────── */}
          <colgroup>
            {selectable && <col style={{ width: '44px' }} />}
            {columns.map((col) => (
              <col key={col.key} style={col.width ? { width: col.width } : undefined} />
            ))}
          </colgroup>

          {/* ── Sticky header ───────────────────────────────────────────────── */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50">
              {/* Selection — select-all checkbox */}
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    id="select-all"
                    aria-label="Select all rows"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 cursor-pointer focus:ring-emerald-500"
                  />
                </th>
              )}

              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    sortState.key === col.key
                      ? sortState.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className={[
                    'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap',
                    col.sortable ? 'cursor-pointer select-none hover:text-slate-900' : '',
                  ].join(' ')}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <SortIcon column={col as ColumnDef<unknown>} sortState={sortState} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ────────────────────────────────────────────────────────── */}
          <tbody className="divide-y divide-slate-100">
            {/* Loading skeleton */}
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={`skeleton-${i}`} colCount={totalCols} />
              ))}

            {/* Empty state */}
            {!loading && sortedData.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Inbox className="w-10 h-10 opacity-40" aria-hidden="true" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading &&
              sortedData.map((item, rowIndex) => {
                const rowId = getRowId(item, rowIndex);
                const isSelected = selectedIds.has(rowId);

                return (
                  <tr
                    key={rowId}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    aria-selected={selectable ? isSelected : undefined}
                    className={[
                      'hover:bg-slate-50/80 transition-colors duration-150',
                      onRowClick ? 'cursor-pointer' : '',
                      isSelected ? 'bg-emerald-50/40' : '',
                    ].join(' ')}
                  >
                    {/* Row selection checkbox */}
                    {selectable && (
                      <td
                        className="px-4 py-3"
                        onClick={(e) => {
                          e.stopPropagation(); // prevent triggering onRowClick
                          toggleRow(item, rowId);
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`row-select-${rowId}`}
                          aria-label={`Select row ${rowIndex + 1}`}
                          checked={isSelected}
                          onChange={() => toggleRow(item, rowId)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-500 cursor-pointer focus:ring-emerald-500"
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-slate-700 align-middle"
                      >
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DataTable };
export default DataTable;
export type { DataTableProps, ColumnDef, ColumnDef as Column, SortDirection };

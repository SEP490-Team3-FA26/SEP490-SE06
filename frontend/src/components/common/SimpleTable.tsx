import React, { ReactNode } from 'react';
import { Inbox, Loader2 } from 'lucide-react';

/**
 * Kolomdefinitie voor de SimpleTable component.
 * Bevat configuratie-opties voor weergave, breedte en uitlijning.
 */
export interface SimpleTableColumn<T> {
  /** Unieke sleutel voor de kolom */
  key: string;
  /** Kolomkoptekst of React-element */
  header: ReactNode;
  /** Optionele eigenschapsnaam of accessorfunctie om de celwaarde te verkrijgen */
  accessor?: keyof T | ((item: T, index: number) => ReactNode);
  /** Aangepaste cel-renderer die het volledige item en de index ontvangt */
  render?: (item: T, index: number) => ReactNode;
  /** Optionele kolombreedte (bijv. "120px", "20%") */
  width?: string | number;
  /** Horizontale uitlijning van de tekst in de kolom */
  align?: 'left' | 'center' | 'right';
  /** Extra CSS-klassen voor de gegevenscellen van deze kolom */
  className?: string;
  /** Extra CSS-klassen voor de kopcel van deze kolom */
  headerClassName?: string;
}

/**
 * Eigenschappen voor de SimpleTable component.
 */
export interface SimpleTableProps<T> {
  /** Gegevensrijen die in de tabel worden weergegeven */
  data: T[];
  /** Kolomdefinities */
  columns: SimpleTableColumn<T>[];
  /** Functie of eigenschap om een unieke sleutel per rij te extraheren */
  rowKey?: keyof T | ((item: T, index: number) => string | number);
  /** Geeft aan of de tabel in een laadtoestand verkeert */
  loading?: boolean;
  /** Aantal skeletrijen dat moet worden getoond tijdens het laden (standaard 4) */
  loadingRows?: number;
  /** Bericht dat wordt weergegeven wanneer de gegevenslijst leeg is */
  emptyText?: ReactNode;
  /** Pictogram dat wordt weergegeven in de lege toestand */
  emptyIcon?: ReactNode;
  /** Bepaalt of de tabel een buitenrand en afgeronde hoeken heeft */
  bordered?: boolean;
  /** Bepaalt of oneven rijen een subtiele achtergrondkleur krijgen */
  striped?: boolean;
  /** Bepaalt of rijen een zweefeffect (hover) hebben */
  hoverable?: boolean;
  /** Compacte modus met gereduceerde cel-padding voor modale vensters */
  compact?: boolean;
  /** Extra CSS-klassen voor de omhullende container */
  className?: string;
  /** Extra CSS-klassen voor de thead */
  headerClassName?: string;
  /** Extra CSS-klassen voor de tbody */
  bodyClassName?: string;
  /** Terugbelfunctie wanneer op een rij wordt geklikt */
  onRowClick?: (item: T, index: number) => void;
  /** Unieke ID voor toegankelijkheidstesten */
  id?: string;
}

/**
 * Hulpfunctie om een stabiele en unieke sleutel voor elke rij op te halen.
 */
function getRowKey<T>(
  item: T,
  index: number,
  rowKey?: keyof T | ((item: T, index: number) => string | number)
): string | number {
  if (typeof rowKey === 'function') {
    return rowKey(item, index);
  }
  if (typeof rowKey === 'string' && rowKey in (item as Record<string, unknown>)) {
    const val = (item as Record<string, unknown>)[rowKey as string];
    if (typeof val === 'string' || typeof val === 'number') {
      return val;
    }
  }
  const candidate = (item as { id?: string | number; _id?: string | number });
  if (candidate?.id !== undefined) return candidate.id;
  if (candidate?._id !== undefined) return candidate._id;
  return index;
}

/**
 * Eenvoudige, herbruikbare tabelcomponent volgens de GPP- en medische ERP-standaarden.
 * Ondersteunt TypeScript generieke types, skeletlaadstatus en aanpasbare kolommen.
 */
export function SimpleTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  loadingRows = 4,
  emptyText = 'Geen gegevens beschikbaar',
  emptyIcon,
  bordered = true,
  striped = false,
  hoverable = true,
  compact = false,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  onRowClick,
  id,
}: SimpleTableProps<T>) {
  // Bepalen van cel-padding op basis van compacte modus
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3.5';

  return (
    <div
      id={id}
      className={`w-full overflow-hidden bg-white ${
        bordered ? 'rounded-xl border border-slate-200 shadow-2xs' : ''
      } ${className}`}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          {/* Tabelkoptekst */}
          <thead>
            <tr
              className={`border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-600 uppercase ${headerClassName}`}
            >
              {columns.map((col) => {
                const alignClass =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={`${cellPadding} ${alignClass} ${col.headerClassName || ''}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Tabelinhoud */}
          <tbody className={`divide-y divide-slate-100 ${bodyClassName}`}>
            {loading ? (
              // Laadstatus met pulserende skeletrijen
              Array.from({ length: loadingRows }).map((_, rIdx) => (
                <tr key={`skeleton-row-${rIdx}`} className="animate-pulse" aria-hidden="true">
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${col.key}-${cIdx}`} className={cellPadding}>
                      <div
                        className="h-3.5 rounded bg-slate-200"
                        style={{
                          width: `${Math.max(40, 85 - ((rIdx + cIdx) % 4) * 15)}%`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Lege status wanneer er geen gegevens zijn
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    {emptyIcon || <Inbox className="h-8 w-8 text-slate-300 stroke-[1.5]" />}
                    <span className="text-xs font-medium text-slate-500">{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              // Normale gegevensrijen
              data.map((item, index) => {
                const key = getRowKey(item, index, rowKey);
                const isClickable = Boolean(onRowClick);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item, index)}
                    className={`transition-colors ${
                      hoverable ? 'hover:bg-slate-50/80' : ''
                    } ${striped && index % 2 === 1 ? 'bg-slate-50/40' : ''} ${
                      isClickable ? 'cursor-pointer active:bg-slate-100' : ''
                    }`}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left';

                      // Celwaarde bepalen via render of accessor
                      let content: ReactNode = null;
                      if (col.render) {
                        content = col.render(item, index);
                      } else if (typeof col.accessor === 'function') {
                        content = col.accessor(item, index);
                      } else if (col.accessor) {
                        content = (item as Record<string, unknown>)[col.accessor as string] as ReactNode;
                      }

                      return (
                        <td
                          key={col.key}
                          className={`${cellPadding} ${alignClass} text-slate-700 ${
                            col.className || ''
                          }`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SimpleTable;

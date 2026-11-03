import React from "react";
import { Snowflake, AlertTriangle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ColdChainBadgeProps {
  /** Lower bound of the required storage temperature in °C. Defaults to 2. */
  tempMin?: number;
  /** Upper bound of the required storage temperature in °C. Defaults to 8. */
  tempMax?: number;
  /** When true, renders the badge in alert (rose) style with pulse animation. */
  isAlert?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GSP Cold Chain storage badge for pharmaceutical products requiring
 * refrigerated conditions.
 *
 * - Normal state: sky/cyan palette with a snowflake icon.
 * - Alert state:  rose palette with animated pulse and a warning triangle icon,
 *                 signalling a detected temperature deviation.
 *
 * Temperature values are rendered in font-mono tabular-nums for precise alignment.
 */
export const ColdChainBadge: React.FC<ColdChainBadgeProps> = ({
  tempMin = 2,
  tempMax = 8,
  isAlert = false,
}) => {
  const containerClass = isAlert
    ? "bg-rose-50 text-rose-700 border border-rose-200/60 animate-pulse"
    : "bg-cyan-50 text-cyan-700 border border-cyan-200/60";

  const Icon = isAlert ? AlertTriangle : Snowflake;

  return (
    <span
      role="status"
      aria-label={
        isAlert
          ? `Cảnh báo nhiệt độ bảo quản lạnh: ${tempMin}°C – ${tempMax}°C`
          : `Bảo quản lạnh: ${tempMin}°C – ${tempMax}°C`
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${containerClass}`}
    >
      <Icon size={12} aria-hidden="true" />

      {/* Temperature range in monospace for aligned digit rendering */}
      <span className="font-mono tabular-nums">
        {tempMin}°C – {tempMax}°C
      </span>
    </span>
  );
};

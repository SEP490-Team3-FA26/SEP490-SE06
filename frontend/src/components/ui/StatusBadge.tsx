import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  /** Status key used to resolve the semantic color and default label */
  status: string;
  /** Override the auto-generated label */
  customLabel?: string;
  /** Size preset */
  size?: BadgeSize;
  /** Additional CSS classes */
  className?: string;
}

// ─── Color Palette ────────────────────────────────────────────────────────────

type ColorScheme = {
  badge: string;
  dot: string;
  label: string;
};

const STATUS_COLOR_MAP: Record<string, ColorScheme> = {
  // ── Positive / Active ──────────────────────────────────────────────────────
  approved:  { badge: 'bg-emerald-50/80 border-emerald-200/60', dot: 'bg-emerald-500', label: 'text-emerald-700' },
  active:    { badge: 'bg-emerald-50/80 border-emerald-200/60', dot: 'bg-emerald-500', label: 'text-emerald-700' },
  completed: { badge: 'bg-emerald-50/80 border-emerald-200/60', dot: 'bg-emerald-500', label: 'text-emerald-700' },
  received:  { badge: 'bg-emerald-50/80 border-emerald-200/60', dot: 'bg-emerald-500', label: 'text-emerald-700' },

  // ── In-progress / Warning ──────────────────────────────────────────────────
  pending:     { badge: 'bg-amber-50/80 border-amber-200/60', dot: 'bg-amber-500', label: 'text-amber-700' },
  processing:  { badge: 'bg-amber-50/80 border-amber-200/60', dot: 'bg-amber-500', label: 'text-amber-700' },
  in_progress: { badge: 'bg-amber-50/80 border-amber-200/60', dot: 'bg-amber-500', label: 'text-amber-700' },

  // ── Negative / Danger ─────────────────────────────────────────────────────
  rejected:     { badge: 'bg-rose-50/80 border-rose-200/60', dot: 'bg-rose-500', label: 'text-rose-700' },
  cancelled:    { badge: 'bg-rose-50/80 border-rose-200/60', dot: 'bg-rose-500', label: 'text-rose-700' },
  out_of_stock: { badge: 'bg-rose-50/80 border-rose-200/60', dot: 'bg-rose-500', label: 'text-rose-700' },
  inactive:     { badge: 'bg-rose-50/80 border-rose-200/60', dot: 'bg-rose-500', label: 'text-rose-700' },

  // ── Pharmaceutical / Chain-of-custody ─────────────────────────────────────
  cold_chain: { badge: 'bg-cyan-50/80 border-cyan-200/60', dot: 'bg-cyan-500', label: 'text-cyan-700' },
  gsp:        { badge: 'bg-cyan-50/80 border-cyan-200/60', dot: 'bg-cyan-500', label: 'text-cyan-700' },

  // ── Draft / New ───────────────────────────────────────────────────────────
  draft: { badge: 'bg-sky-50/80 border-sky-200/60', dot: 'bg-sky-500', label: 'text-sky-700' },
  new:   { badge: 'bg-sky-50/80 border-sky-200/60', dot: 'bg-sky-500', label: 'text-sky-700' },
};

const DEFAULT_COLOR: ColorScheme = {
  badge: 'bg-slate-50/80 border-slate-200/60',
  dot:   'bg-slate-400',
  label: 'text-slate-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a snake_case status key into a human-readable label.
 * e.g. "in_progress" → "In Progress"
 */
function toReadableLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const sizeConfig: Record<BadgeSize, { badge: string; dot: string; text: string }> = {
  sm: { badge: 'px-2 py-0.5 gap-1',      dot: 'w-1.5 h-1.5', text: 'text-xs' },
  md: { badge: 'px-2.5 py-1 gap-1.5',    dot: 'w-2 h-2',     text: 'text-xs font-medium' },
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * StatusBadge displays a semantic, pill-shaped label with a colored dot
 * indicator. Color is resolved automatically from the `status` prop.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customLabel,
  size = 'md',
  className = '',
}) => {
  const colors = STATUS_COLOR_MAP[status.toLowerCase()] ?? DEFAULT_COLOR;
  const sz = sizeConfig[size];
  const label = customLabel ?? toReadableLabel(status);

  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      className={[
        // Pill shape with glassmorphism tint
        'inline-flex items-center rounded-full border',
        colors.badge,
        sz.badge,
        sz.text,
        className,
      ].join(' ')}
    >
      {/* Animated pulse dot indicator */}
      <span className="relative flex shrink-0">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${colors.dot}`}
          aria-hidden="true"
        />
        <span
          className={`relative inline-flex rounded-full ${sz.dot} ${colors.dot}`}
          aria-hidden="true"
        />
      </span>

      <span className={colors.label}>{label}</span>
    </span>
  );
};

export { StatusBadge };
export default StatusBadge;
export type { StatusBadgeProps, BadgeSize };

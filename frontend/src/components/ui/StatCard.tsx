import React, { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CardColor = 'emerald' | 'teal' | 'sky' | 'amber' | 'rose' | 'violet';

interface TrendData {
  /** Numeric percentage change (positive = up, negative = down) */
  value: number;
  /** Context label displayed beside the trend value, e.g. "vs last month" */
  label: string;
}

interface StatCardProps {
  /** Card title / metric name */
  title: string;
  /** Primary metric value — numbers are formatted with vi-VN locale */
  value: string | number;
  /** Icon element rendered inside the gradient icon container */
  icon: ReactNode;
  /** Optional trend indicator */
  trend?: TrendData;
  /** Shows skeleton placeholder when true */
  loading?: boolean;
  /** Theme color applied to the icon container gradient */
  color?: CardColor;
  /** Additional CSS classes for the root element */
  className?: string;
}

// ─── Color Gradient Map ───────────────────────────────────────────────────────

const iconGradientMap: Record<CardColor, string> = {
  emerald: 'from-emerald-400 to-teal-500',
  teal:    'from-teal-400 to-cyan-500',
  sky:     'from-sky-400 to-blue-500',
  amber:   'from-amber-400 to-orange-500',
  rose:    'from-rose-400 to-pink-500',
  violet:  'from-violet-400 to-purple-500',
};

const iconShadowMap: Record<CardColor, string> = {
  emerald: 'shadow-emerald-200/60',
  teal:    'shadow-teal-200/60',
  sky:     'shadow-sky-200/60',
  amber:   'shadow-amber-200/60',
  rose:    'shadow-rose-200/60',
  violet:  'shadow-violet-200/60',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const viVNFormatter = new Intl.NumberFormat('vi-VN');

function formatValue(value: string | number): string {
  if (typeof value === 'number') {
    return viVNFormatter.format(value);
  }
  return value;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200/80 ${className}`}
      aria-hidden="true"
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * StatCard displays a KPI metric with an icon, optional trend indicator,
 * and a glassmorphism-style card surface.
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  loading = false,
  color = 'emerald',
  className = '',
}) => {
  const iconGradient = iconGradientMap[color];
  const iconShadow = iconShadowMap[color];

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading statistic"
        className={[
          'bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-5',
          className,
        ].join(' ')}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-32" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <SkeletonBlock className="h-12 w-12 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Trend direction ─────────────────────────────────────────────────────────
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <article
      className={[
        // Glassmorphism card surface
        'bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-5',
        // Hover elevation
        'hover:shadow-md hover:border-slate-300/60 transition-all duration-300',
        className,
      ].join(' ')}
      aria-label={`${title}: ${formatValue(value)}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* ── Left column: text content ────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-sm text-slate-500 font-medium truncate">{title}</p>

          {/* Primary value */}
          <p className="mt-1 text-2xl font-bold text-slate-800 tabular-nums leading-tight">
            {formatValue(value)}
          </p>

          {/* Trend indicator */}
          {trend && (
            <div
              className={[
                'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                isPositiveTrend ? 'text-emerald-600' : 'text-rose-600',
              ].join(' ')}
              aria-label={`Trend: ${trend.value >= 0 ? '+' : ''}${trend.value}% ${trend.label}`}
            >
              {isPositiveTrend ? (
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {trend.value >= 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-slate-400 font-normal">{trend.label}</span>
            </div>
          )}
        </div>

        {/* ── Right column: icon ───────────────────────────────────────────── */}
        <div
          className={[
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
            `bg-gradient-to-br ${iconGradient} shadow-md ${iconShadow}`,
          ].join(' ')}
          aria-hidden="true"
        >
          <span className="text-white w-6 h-6 [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </span>
        </div>
      </div>
    </article>
  );
};

export { StatCard };
export default StatCard;
export type { StatCardProps, CardColor, TrendData };

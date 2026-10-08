import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button */
  variant?: ButtonVariant;
  /** Size preset controlling padding and font size */
  size?: ButtonSize;
  /** Shows a spinner and disables interaction while true */
  loading?: boolean;
  /** Icon rendered to the left of the label */
  leftIcon?: ReactNode;
  /** Icon rendered to the right of the label */
  rightIcon?: ReactNode;
}

// ─── Style Maps ───────────────────────────────────────────────────────────────

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 ' +
    'text-white shadow-md shadow-emerald-200/60 border-transparent',
  secondary:
    'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
  danger:
    'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 ' +
    'text-white shadow-md shadow-rose-200/60 border-transparent',
  outline:
    'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 bg-transparent',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent bg-transparent',
  success:
    'bg-gradient-to-r from-emerald-400 to-green-500 text-white border-transparent shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Atom-level Button with multiple variants, sizes, loading state, and icon slots.
 * Forwards ref to the underlying <button> element.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const baseClasses = [
      // Layout
      'inline-flex items-center justify-center font-medium',
      // Transitions & interactions
      'transition-all duration-200 ease-in-out',
      'active:scale-[0.97]',
      // Disabled / loading state
      isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
      // Focus ring
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500',
    ].join(' ');

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...rest}
      >
        {/* Loading spinner replaces leftIcon */}
        {loading ? (
          <Loader2 className={`${iconSizeClasses[size]} animate-spin`} aria-hidden="true" />
        ) : (
          leftIcon && (
            <span className={iconSizeClasses[size]} aria-hidden="true">
              {leftIcon}
            </span>
          )
        )}

        {children}

        {/* Right icon — hidden during loading to keep width stable */}
        {!loading && rightIcon && (
          <span className={iconSizeClasses[size]} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export default Button;
export type { ButtonProps, ButtonVariant, ButtonSize };

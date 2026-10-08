import React, {
  ReactNode,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Called when the user requests to close the modal (Escape, backdrop click, ×) */
  onClose: () => void;
  /** Panel title — also used as the accessible dialog label */
  title?: string;
  /** Max-width preset of the panel */
  size?: ModalSize;
  /** Modal panel content */
  children: ReactNode;
}

// ─── Internal Context ─────────────────────────────────────────────────────────

interface ModalContextValue {
  onClose: () => void;
  title?: string;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('Modal sub-components must be used inside <Modal>');
  }
  return ctx;
}

// ─── Size Map ─────────────────────────────────────────────────────────────────

const sizeClasses: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-7xl',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Modal.Header — displays the title and the close (×) button.
 * If no children are passed, the title from the parent Modal prop is used.
 */
function ModalHeader({ children }: { children?: ReactNode }) {
  const { onClose, title } = useModalContext();

  return (
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
      <div className="flex-1 min-w-0">
        {children ?? (
          title && (
            <h2 className="text-base font-semibold text-slate-800 truncate">
              {title}
            </h2>
          )
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal"
        className={[
          'ml-4 flex-shrink-0 flex items-center justify-center',
          'w-8 h-8 rounded-lg',
          'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        ].join(' ')}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Modal.Body — scrollable content area.
 */
function ModalBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-5 overflow-y-auto flex-1 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Modal.Footer — action button row, right-aligned by default.
 */
function ModalFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={[
        'px-6 pb-5 pt-4 border-t border-slate-100',
        'flex items-center justify-end gap-3',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

/**
 * Modal compound component with glassmorphism panel, animated backdrop,
 * focus trap, and Escape-to-close behaviour.
 *
 * Usage:
 * ```tsx
 * <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit Record" size="md">
 *   <Modal.Header />
 *   <Modal.Body>…</Modal.Body>
 *   <Modal.Footer>
 *     <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
 *     <Button>Save</Button>
 *   </Modal.Footer>
 * </Modal>
 * ```
 */
function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Escape to close ────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll while modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // ── Focus trap: move focus into panel when it opens ────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Defer to next tick so the panel has rendered
      const raf = requestAnimationFrame(() => {
        panelRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen]);

  // ── Backdrop click ─────────────────────────────────────────────────────────
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <ModalContext.Provider value={{ onClose, title }}>
      <AnimatePresence>
        {isOpen && (
          /* ── Backdrop ──────────────────────────────────────────────────── */
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={[
              'fixed inset-0 z-50 flex items-center justify-center p-4',
              'bg-slate-900/40 backdrop-blur-sm',
            ].join(' ')}
            onClick={handleBackdropClick}
            aria-modal="true"
            role="dialog"
            aria-label={title ?? 'Dialog'}
          >
            {/* ── Panel ────────────────────────────────────────────────────── */}
            <motion.div
              key="modal-panel"
              ref={panelRef}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={[
                // Glassmorphism panel surface
                'bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60',
                // Layout
                'w-full flex flex-col max-h-[90vh]',
                // Responsive max-width
                sizeClasses[size],
                // Focus outline suppression (visual focus managed via keyboard)
                'outline-none',
              ].join(' ')}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

// ── Attach sub-components ──────────────────────────────────────────────────────
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export { Modal };
export default Modal;
export type { ModalProps, ModalSize };

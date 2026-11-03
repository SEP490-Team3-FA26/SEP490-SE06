/**
 * ABC Pharmacy ERP — Unified UI Kit Export Barrel
 *
 * Provides a single import path for all shared UI primitives.
 * Usage: import { Button, StatusBadge, DataTable } from '@/components/ui';
 */

// Atoms
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';

export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export { CurrencyText } from './CurrencyText';

// Molecules
export { SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

// Organisms
export { DataTable } from './DataTable';
export type { Column, DataTableProps } from './DataTable';
// Eenvoudige tabelcomponent voor lichte ERP-interfaces
export { SimpleTable } from '../common/SimpleTable';
export type { SimpleTableColumn, SimpleTableProps } from '../common/SimpleTable';

// Navigation / Shell
export { Sidebar } from './Sidebar';
export type { NavItem } from './Sidebar';

export { Header } from './Header';
export { Logo, MascotLogoIcon } from './Logo';

// Molecules — standalone
export { Tabs } from './Tabs';
export { Select } from './Select';
export { MonthPicker } from './MonthPicker';
export { NotificationBell } from './NotificationBell';

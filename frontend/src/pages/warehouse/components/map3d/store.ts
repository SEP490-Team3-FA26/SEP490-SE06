// ============================================================================
// Quản Lý Trạng Thái Sơ Đồ Kho 3D (Single Source of Truth)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Không có cameraGoal state riêng, không có isUserInteractingRef
// ============================================================================

import { RACK_ORDER } from './constants';

export type View =
  | { level: 'overview' }
  | { level: 'rack'; rack: string; shelf: number | null; bin: number | null };

export type Action =
  | { type: 'OVERVIEW' }
  | { type: 'OPEN_RACK'; rack: string }
  | { type: 'STEP_RACK'; dir: 1 | -1 }
  | { type: 'SELECT_SHELF'; shelf: number | null }
  | { type: 'SELECT_BIN'; shelf: number; bin: number }
  | { type: 'GOTO'; rack: string; shelf?: number; bin?: number };

export function viewReducer(s: View, a: Action): View {
  switch (a.type) {
    case 'OVERVIEW':
      return { level: 'overview' };

    case 'OPEN_RACK':
      return { level: 'rack', rack: a.rack, shelf: null, bin: null };

    case 'STEP_RACK': {
      if (s.level !== 'rack') return s;
      const currentIndex = RACK_ORDER.indexOf(s.rack);
      const nextIndex = (currentIndex + a.dir + RACK_ORDER.length) % RACK_ORDER.length;
      return { level: 'rack', rack: RACK_ORDER[nextIndex], shelf: s.shelf, bin: null };
    }

    case 'SELECT_SHELF':
      return s.level === 'rack' ? { ...s, shelf: a.shelf, bin: null } : s;

    case 'SELECT_BIN':
      return s.level === 'rack' ? { ...s, shelf: a.shelf, bin: a.bin } : s;

    case 'GOTO':
      return {
        level: 'rack',
        rack: a.rack,
        shelf: a.shelf ?? null,
        bin: a.bin ?? null,
      };

    default:
      return s;
  }
}

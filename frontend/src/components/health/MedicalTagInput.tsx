import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

// Định nghĩa thuộc tính cho linh kiện nhập và gắn nhãn tag y tế (Atomic Component theo FE-COMPONENT)
interface MedicalTagInputProps {
  label: string;
  placeholder: string;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  colorScheme?: 'rose' | 'amber' | 'purple' | 'teal' | 'blue';
  icon?: React.ReactNode;
  disabled?: boolean;
}

// Bảng màu y tế chuẩn theo chuẩn FE-DESIGN
const COLOR_CLASSES = {
  rose: {
    tag: 'bg-rose-50 text-rose-700 border-rose-200',
    btn: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    delBtn: 'hover:text-rose-950',
  },
  amber: {
    tag: 'bg-amber-50 text-amber-800 border-amber-200',
    btn: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    delBtn: 'hover:text-amber-950',
  },
  purple: {
    tag: 'bg-purple-50 text-purple-700 border-purple-200',
    btn: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    delBtn: 'hover:text-purple-950',
  },
  teal: {
    tag: 'bg-teal-50 text-teal-900 border-teal-200',
    btn: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
    delBtn: 'hover:text-teal-950',
  },
  blue: {
    tag: 'bg-blue-50 text-blue-700 border-blue-200',
    btn: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    delBtn: 'hover:text-blue-950',
  },
};

export const MedicalTagInput: React.FC<MedicalTagInputProps> = ({
  label,
  placeholder,
  tags,
  onAddTag,
  onRemoveTag,
  colorScheme = 'blue',
  icon,
  disabled = false,
}) => {
  const [inputVal, setInputVal] = useState('');
  const colors = COLOR_CLASSES[colorScheme];

  // Xử lý thêm tag mới
  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
      setInputVal('');
    }
  };

  // Bắt phím Enter để tạo tag nhanh
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !inputVal.trim()}
          className={`px-4 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${colors.btn}`}
        >
          <Plus size={13} />
          <span>Thêm</span>
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-xl text-xs font-bold transition-all ${colors.tag}`}
            >
              {icon && <span className="opacity-80 scale-90">{icon}</span>}
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  aria-label={`Xóa nhãn ${tag}`}
                  className={`cursor-pointer transition-colors ${colors.delBtn}`}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicalTagInput;

import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

// ===================================================================
// RichTextEditor — Trình soạn thảo văn bản phong phú (Native Quill 2.x)
// Sử dụng trực tiếp Quill JS (ESM hiện đại) không phụ thuộc react-quill wrapper:
// - Hoàn toàn tương thích React 19 và Vite mà không bị lỗi resolve
// - Đầy đủ tính năng: Bold, Italic, Underline, Strikethrough, màu chữ,
//   màu nền, cỡ chữ, căn lề, danh sách, link, xóa định dạng
// - Tự động đồng bộ 2 chiều (two-way binding) an toàn không giật con trỏ
// ===================================================================

interface RichTextEditorProps {
  /** Giá trị HTML hiện tại */
  value: string;
  /** Callback khi nội dung thay đổi, trả về chuỗi HTML */
  onChange: (html: string) => void;
  /** Placeholder hiển thị khi trống */
  placeholder?: string;
  /** Chiều cao tối thiểu vùng soạn thảo (px) */
  minHeight?: number;
}

// Cấu hình toolbar của Quill — đầy đủ các chức năng định dạng tự do
const TOOLBAR_OPTIONS = [
  // Nhóm 1: Cỡ tiêu đề và cỡ chữ
  [{ header: [1, 2, 3, false] }],
  [{ size: ["small", false, "large", "huge"] }],

  // Nhóm 2: Định dạng chữ cơ bản
  ["bold", "italic", "underline", "strike"],

  // Nhóm 3: Màu chữ và màu nền
  [{ color: [] }, { background: [] }],

  // Nhóm 4: Danh sách và thụt đầu dòng
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],

  // Nhóm 5: Căn lề
  [{ align: [] }],

  // Nhóm 6: Chèn liên kết và xóa định dạng
  ["link", "clean"],
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Nhập nội dung soạn thảo...",
  minHeight = 120,
}) => {
  // Container bọc toàn bộ toolbar và editor DOM của Quill
  const containerRef = useRef<HTMLDivElement>(null);
  // Lưu tham chiếu Quill instance để tương tác API
  const quillInstance = useRef<Quill | null>(null);
  // Cờ chặn loop sự kiện giữa value prop và onChange callback
  const isUpdatingRef = useRef<boolean>(false);

  // Khởi tạo Quill instance khi component mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Dọn sạch container trước khi tạo mới để tránh trùng lặp khi HMR
    containerRef.current.innerHTML = "";

    // Tạo phần tử DIV con làm editor root cho Quill
    const editorEl = document.createElement("div");
    containerRef.current.appendChild(editorEl);

    // Khởi tạo Quill với theme Snow
    const quill = new Quill(editorEl, {
      theme: "snow",
      placeholder,
      modules: {
        toolbar: TOOLBAR_OPTIONS,
      },
    });

    quillInstance.current = quill;

    // Gán giá trị ban đầu nếu có
    if (value) {
      quill.root.innerHTML = value;
    }

    // Lắng nghe sự kiện thay đổi văn bản từ người dùng
    quill.on("text-change", () => {
      if (isUpdatingRef.current) return;
      const html = quill.root.innerHTML;
      // Quill coi vùng trống là <p><br></p> -> chuẩn hóa về chuỗi rỗng
      const cleanHtml = html === "<p><br></p>" ? "" : html;
      onChange(cleanHtml);
    });

    // Dọn dẹp DOM và instance khi unmount
    return () => {
      quillInstance.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  // Đồng bộ giá trị từ prop value vào Quill khi prop thay đổi từ bên ngoài (reset/load mẫu)
  useEffect(() => {
    const quill = quillInstance.current;
    if (!quill) return;

    const currentHtml = quill.root.innerHTML;
    const normalizedCurrent = currentHtml === "<p><br></p>" ? "" : currentHtml;
    const normalizedValue = value || "";

    if (normalizedCurrent !== normalizedValue) {
      isUpdatingRef.current = true;
      quill.root.innerHTML = normalizedValue;
      isUpdatingRef.current = false;
    }
  }, [value]);

  return (
    <div className="rich-text-editor-wrapper" style={{ position: "relative" }}>
      {/* CSS tinh chỉnh giao diện Quill theo design system ABC Pharmacy */}
      <style>{`
        .rich-text-editor-wrapper .ql-container {
          min-height: ${minHeight}px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 14px;
          border-radius: 0 0 8px 8px;
          border-color: #e2e8f0;
          background: #ffffff;
        }
        .rich-text-editor-wrapper .ql-toolbar {
          border-radius: 8px 8px 0 0;
          border-color: #e2e8f0;
          background: #fafbfc;
          padding: 8px 10px;
        }
        .rich-text-editor-wrapper .ql-toolbar .ql-stroke {
          stroke: #374151;
        }
        .rich-text-editor-wrapper .ql-toolbar .ql-fill {
          fill: #374151;
        }
        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
          stroke: #0070ba;
        }
        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-fill,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
          fill: #0070ba;
        }
        .rich-text-editor-wrapper .ql-toolbar button:hover,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active,
        .rich-text-editor-wrapper .ql-toolbar .ql-picker-label:hover {
          color: #0070ba;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: ${minHeight}px;
          padding: 12px 14px;
          line-height: 1.6;
          color: #0f172a;
        }
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
          font-size: 14px;
        }
        .rich-text-editor-wrapper .ql-editor p {
          margin: 2px 0;
        }
        .rich-text-editor-wrapper .ql-editor ul,
        .rich-text-editor-wrapper .ql-editor ol {
          padding-left: 20px;
        }
        .rich-text-editor-wrapper .ql-picker-options {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
          padding: 4px;
          z-index: 50;
        }
        .rich-text-editor-wrapper .ql-picker-item:hover {
          background: #f0f9ff;
          color: #0070ba;
          border-radius: 4px;
        }
      `}</style>

      {/* Vùng gắn Quill editor DOM */}
      <div ref={containerRef} />
    </div>
  );
};

export default RichTextEditor;

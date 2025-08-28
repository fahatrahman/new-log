// src/components/Modal.js
import React, { useEffect, useRef } from "react";

export default function Modal({ open, onClose, title, maxWidth = "max-w-2xl", children }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  // Lock scroll + ESC to close (hooks must run unconditionally)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Focus the panel when opened
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  const onOverlayMouseDown = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  return open ? (
    <div
      ref={overlayRef}
      onMouseDown={onOverlayMouseDown}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`w-full ${maxWidth} bg-white rounded-xl shadow-xl outline-none animate-[fadeIn_.2s_ease-out]`}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-red-600">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center px-2 py-1 text-sm rounded-md hover:bg-gray-100"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  ) : null;
}

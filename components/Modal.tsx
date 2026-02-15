
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onClose) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // We only allow closing via backdrop if an onClose function is provided
  const handleBackdropClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center overflow-hidden"
    >
      {/* Dynamic Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-fade-in"
        onClick={handleBackdropClick}
      />

      <div
        className="bg-slate-900/80 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] p-8 w-full max-w-4xl m-4 relative z-10 transform animate-zoom-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 group"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
};

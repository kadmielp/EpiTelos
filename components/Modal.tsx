import { useLanguage } from '../i18n';

import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const { t } = useLanguage();
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
      className="app-modal fixed inset-0 z-[100] flex justify-center items-center overflow-hidden"
    >
      {/* Dynamic Backdrop */}
      <div
        className="app-modal-backdrop absolute inset-0 animate-fade-in"
        onClick={handleBackdropClick}
      />

      <div
        className="app-modal-panel bg-neutral-900/80 rounded-[32px] border border-white/10 p-8 w-full max-w-4xl m-4 relative z-10 transform animate-zoom-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-neutral-500 " />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{title}</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 group"
              aria-label={t('Close modal')}
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

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type?: ToastType;
  text: React.ReactNode;
  durationMs?: number; // default 3000
}

type ToastContextValue = {
  showToast: (opts: ToastOptions | string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<ToastType>('info');
  const [text, setText] = useState<React.ReactNode>('');
  const hideTimer = useRef<number | null>(null);

  const clearTimer = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const showToast = useCallback((opts: ToastOptions | string) => {
    const normalized: ToastOptions = typeof opts === 'string' ? { text: opts } : opts;
    setType(normalized.type || 'info');
    setText(normalized.text);
    setVisible(true);
    clearTimer();
    const dur = Math.max(1500, normalized.durationMs || 3000);
    hideTimer.current = window.setTimeout(() => setVisible(false), dur) as unknown as number;
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;
  const colorClasses = type === 'success'
    ? 'bg-green-600'
    : type === 'error'
      ? 'bg-red-600'
      : 'bg-blue-600';

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Center overlay toast */}
      <div className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} aria-live="polite" aria-atomic="true">
        {visible && (
          <div className={`pointer-events-auto shadow-xl rounded-lg text-white px-4 py-3 flex items-center space-x-3 ${colorClasses}`}
               role="status">
            <Icon className="h-5 w-5" />
            <span className="font-medium">{text}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};

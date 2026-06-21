import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';

const Toast: React.FC = () => {
  const { toast, clearToast } = useAppStore(
    useShallow((s) => ({ toast: s.toast, clearToast: s.clearToast }))
  );

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(clearToast, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  if (!toast) return null;

  const config = {
    success: {
      icon: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />,
      cls: 'bg-emerald-50/75 dark:bg-emerald-950/45 border-emerald-200/60 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 shadow-emerald-500/5',
    },
    error: {
      icon: <AlertCircle className="w-4.5 h-4.5 text-red-500" />,
      cls: 'bg-red-50/75 dark:bg-red-950/45 border-red-200/60 dark:border-red-500/20 text-red-800 dark:text-red-300 shadow-red-500/5',
    },
    info: {
      icon: <Info className="w-4.5 h-4.5 text-blue-500" />,
      cls: 'bg-blue-50/75 dark:bg-blue-950/45 border-blue-200/60 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 shadow-blue-500/5',
    },
  };

  const { icon, cls } = config[toast.type];

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md ${cls}`}>
        {icon}
        <p className="text-sm font-semibold">{toast.message}</p>
        <button
          onClick={clearToast}
          className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;

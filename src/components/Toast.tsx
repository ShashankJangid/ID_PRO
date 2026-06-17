import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';

const Toast: React.FC = () => {
  const { toast, clearToast } = useAppStore(
    useShallow((s) => ({ toast: s.toast, clearToast: s.clearToast }))
  );

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${bgColors[toast.type]}`}
      >
        {icons[toast.type]}
        <p className="text-sm font-medium text-gray-800">{toast.message}</p>
        <button
          onClick={clearToast}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default Toast;

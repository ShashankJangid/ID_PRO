import React from 'react';
import { Type, Image, Shapes, QrCode, Undo2, Redo2 } from 'lucide-react';
import type { CardElement } from '@/types';

interface DesignerToolbarProps {
  onAddElement: (type: CardElement['type']) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const DesignerToolbar: React.FC<DesignerToolbarProps> = ({
  onAddElement,
  zoom,
  onZoomChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  return (
    <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2.5 z-10 select-none">
      <button
        onClick={() => onAddElement('text')}
        className="w-16 py-2 flex flex-col items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
        title="Add Text Element"
      >
        <Type className="w-5 h-5 mb-1" />
        <span className="text-[9px] font-semibold">Text</span>
      </button>
      <button
        onClick={() => onAddElement('image')}
        className="w-16 py-2 flex flex-col items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
        title="Add Image Element"
      >
        <Image className="w-5 h-5 mb-1" />
        <span className="text-[9px] font-semibold">Image</span>
      </button>
      <button
        onClick={() => onAddElement('shape')}
        className="w-16 py-2 flex flex-col items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
        title="Add Shape Element"
      >
        <Shapes className="w-5 h-5 mb-1" />
        <span className="text-[9px] font-semibold">Shape</span>
      </button>
      <button
        onClick={() => onAddElement('qr')}
        className="w-16 py-2 flex flex-col items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
        title="Add QR Code"
      >
        <QrCode className="w-5 h-5 mb-1" />
        <span className="text-[9px] font-semibold">QR Code</span>
      </button>

      <div className="w-12 h-px bg-gray-200 my-1" />

      {onUndo && onRedo && (
        <>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="w-16 py-1.5 flex flex-col items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-colors"
            title="Undo Last Action"
          >
            <Undo2 className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-semibold">Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="w-16 py-1.5 flex flex-col items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-colors"
            title="Redo Last Action"
          >
            <Redo2 className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-semibold">Redo</span>
          </button>
          <div className="w-12 h-px bg-gray-200 my-1" />
        </>
      )}

      <button
        onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))}
        className="w-16 py-1 flex flex-col items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        title="Zoom Out"
      >
        <span className="text-sm font-extrabold leading-none">-</span>
        <span className="text-[9px] font-semibold mt-0.5">Zoom Out</span>
      </button>
      <span className="text-[10px] text-gray-500 font-bold my-0.5">{Math.round(zoom * 100)}%</span>
      <button
        onClick={() => onZoomChange(Math.min(3, zoom + 0.1))}
        className="w-16 py-1 flex flex-col items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        title="Zoom In"
      >
        <span className="text-sm font-extrabold leading-none">+</span>
        <span className="text-[9px] font-semibold mt-0.5">Zoom In</span>
      </button>
    </div>
  );
};

export default DesignerToolbar;

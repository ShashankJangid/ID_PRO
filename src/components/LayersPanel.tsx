import React, { useState } from 'react';
import { Type, Image, Shapes, QrCode, Layers, ChevronUp, ChevronDown, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CardElement } from '@/types';

interface LayersPanelProps {
  elements: CardElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onMoveElement: (id: string, direction: 'up' | 'down') => void;
  onDeleteElement: (id: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onMoveElement,
  onDeleteElement,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getElementIcon = (type: CardElement['type']) => {
    switch (type) {
      case 'text':
        return <Type className="w-4 h-4 text-sky-500" />;
      case 'image':
        return <Image className="w-4 h-4 text-emerald-500" />;
      case 'shape':
        return <Shapes className="w-4 h-4 text-amber-500" />;
      case 'qr':
        return <QrCode className="w-4 h-4 text-purple-500" />;
      default:
        return <Layers className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          title="Show Layers"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="h-px w-8 bg-gray-100" />
        <div className="flex flex-col gap-3 items-center">
          <Layers className="w-4 h-4 text-gray-400" />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
            Layers
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-white border-r border-gray-200 flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-700">Layers ({elements.length})</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
          title="Collapse Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {elements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            No elements yet.<br />Add elements from toolbar.
          </div>
        ) : (
          /* Render layers reversed so top elements in z-index show at the top of list (Photoshop style) */
          [...elements].reverse().map((el, revIdx) => {
            const actualIdx = elements.length - 1 - revIdx;
            const isSelected = el.id === selectedElementId;
            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                    : 'bg-white border-transparent hover:bg-gray-50 text-gray-700 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex-shrink-0">{getElementIcon(el.type)}</div>
                  <div className="truncate text-xs">
                    {el.label || `New ${el.type}`}
                    {el.field && <span className="text-[10px] text-gray-400 font-normal ml-1">({el.field})</span>}
                  </div>
                </div>

                {/* Layer Ordering and Delete Controls */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveElement(el.id, 'up'); // Bring Forward
                    }}
                    disabled={actualIdx === elements.length - 1}
                    className="p-1 hover:bg-gray-200 text-gray-500 hover:text-gray-700 disabled:opacity-25 rounded transition-colors"
                    title="Bring Forward"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveElement(el.id, 'down'); // Send Backward
                    }}
                    disabled={actualIdx === 0}
                    className="p-1 hover:bg-gray-200 text-gray-500 hover:text-gray-700 disabled:opacity-25 rounded transition-colors"
                    title="Send Backward"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this element?')) {
                        onDeleteElement(el.id);
                      }
                    }}
                    className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors"
                    title="Delete Element"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LayersPanel;

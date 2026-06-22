import React, { useState } from 'react';
import { Type, Image, Shapes, QrCode, Layers, ChevronUp, ChevronDown, Trash2, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import type { CardElement } from '@/types';

interface LayersPanelProps {
  elements: CardElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onMoveElement: (id: string, direction: 'up' | 'down') => void;
  onDeleteElement: (id: string) => void;
  onReorderElements: (elements: CardElement[]) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onMoveElement,
  onDeleteElement,
  onReorderElements,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      const reordered = [...elements];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, removed);
      onReorderElements(reordered);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 glass-panel border-r border-gray-200/10 flex flex-col items-center py-4 gap-4 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 hover:bg-gray-500/15 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
          title="Show Layers"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="h-px w-8 bg-gray-200/10" />
        <div className="flex flex-col gap-3 items-center">
          <Layers className="w-4 h-4 text-gray-400" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
            Layers
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 glass-panel border-r border-gray-200/10 flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3 border-b border-gray-200/10 flex items-center justify-between bg-gray-500/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Layers ({elements.length})</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-500/15 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
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
            const isDragOver = dragOverIndex === actualIdx;
            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, actualIdx)}
                onDragOver={(e) => handleDragOver(e, actualIdx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, actualIdx)}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                  isDragOver
                    ? 'border-dashed border-emerald-500 bg-emerald-500/10 scale-[0.98]'
                    : isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-950 dark:text-emerald-300 font-medium'
                    : 'bg-transparent border-transparent hover:bg-gray-500/5 text-gray-700 dark:text-gray-300 hover:border-gray-200/10'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-400 cursor-grab group-hover:text-gray-400 flex-shrink-0" />
                  <div className="flex-shrink-0">{getElementIcon(el.type)}</div>
                  <div className="truncate text-xs">
                    {el.label || `New ${el.type}`}
                    {el.field && <span className="text-[10px] text-gray-400 dark:text-gray-400 font-normal ml-1">({el.field})</span>}
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
                    className="p-1 hover:bg-gray-500/15 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-25 rounded transition-colors"
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
                    className="p-1 hover:bg-gray-500/15 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-25 rounded transition-colors"
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
                    className="p-1 hover:bg-red-500/10 text-red-500 rounded transition-colors"
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

import React, { useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PenTool, Save, Download } from 'lucide-react';
import { useAppStore } from '@/store';
import { useDragResize } from '@/hooks/useDragResize';
import { useDesignerHistory } from '@/hooks/useDesignerHistory';
import DesignerToolbar from './designer/DesignerToolbar';
import DesignerCanvas from './designer/DesignerCanvas';
import PropertiesPanel from './designer/PropertiesPanel';
import LayersPanel from './designer/LayersPanel';
import TemplatePropertiesPanel from './designer/TemplatePropertiesPanel';
import type { CardElement, CardTemplate } from '@/types';

const CardDesigner: React.FC = () => {
  const {
    getActiveTemplate,
    updateTemplate,
    addTemplate,
    organization,
    cardDataList,
    designerSide,
    setDesignerSide,
    selectedElementId,
    setSelectedElementId,
    zoom,
    setZoom,
    showToast,
  } = useAppStore(
    useShallow((s) => ({
      getActiveTemplate: s.getActiveTemplate,
      updateTemplate: s.updateTemplate,
      addTemplate: s.addTemplate,
      organization: s.organization,
      cardDataList: s.cardDataList,
      designerSide: s.designerSide,
      setDesignerSide: s.setDesignerSide,
      selectedElementId: s.selectedElementId,
      setSelectedElementId: s.setSelectedElementId,
      zoom: s.zoom,
      setZoom: s.setZoom,
      showToast: s.showToast,
    }))
  );

  const activeTemplate = getActiveTemplate();

  // Initialize and track history for the template edits
  const {
    state: currentTemplate,
    set: setCurrentTemplate,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  } = useDesignerHistory<CardTemplate | null>(null);

  // Sync with active template when selected
  useEffect(() => {
    if (activeTemplate && (!currentTemplate || currentTemplate.id !== activeTemplate.id)) {
      reset(activeTemplate);
    }
  }, [activeTemplate, reset, currentTemplate]);

  const cardRef = useRef<HTMLDivElement>(null);

  const demoCard = cardDataList[0] || {
    name: 'Sample Name',
    role: 'Designation',
    code: 'DEMO-001',
    dob: '01-01-2000',
    blood: 'A+',
    contact: '+91-XXXXXXXXXX',
    address: 'School Address, City',
    issued: '01-06-2025',
    valid: '31-05-2026',
    emergency: '+91-XXXXXXXXXX',
  };

  const elements = currentTemplate
    ? designerSide === 'front'
      ? currentTemplate.frontElements
      : currentTemplate.backElements
    : [];

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const handleElementUpdate = useCallback(
    (id: string, updates: Partial<CardElement>, commitToHistory = true) => {
      setCurrentTemplate((prev) => {
        if (!prev) return null;
        const newTemplate = { ...prev };
        const sideElements =
          designerSide === 'front' ? [...newTemplate.frontElements] : [...newTemplate.backElements];
        const idx = sideElements.findIndex((el) => el.id === id);
        if (idx >= 0) {
          sideElements[idx] = { ...sideElements[idx], ...updates };
          if (designerSide === 'front') {
            newTemplate.frontElements = sideElements;
          } else {
            newTemplate.backElements = sideElements;
          }
          return newTemplate;
        }
        return prev;
      }, commitToHistory);
    },
    [designerSide, setCurrentTemplate]
  );

  // Dragging and alignment guides logic
  const {
    guides,
    handleMouseDown,
    handleResizeStart,
    handleMouseMove,
    handleMouseUp,
  } = useDragResize({
    currentTemplate,
    elements,
    zoom,
    cardRef,
    handleElementUpdate,
    setSelectedElementId,
  });

  const addElement = (type: CardElement['type'] | 'logo') => {
    setCurrentTemplate((prev) => {
      if (!prev) return null;
      let newEl: CardElement;
      if (type === 'logo') {
        newEl = {
          id: `el_${Date.now()}`,
          type: 'image',
          imageSource: 'logo',
          label: 'Company Logo',
          x: 25,
          y: 25,
          width: 70,
          height: 70,
          style: {
            objectFit: 'contain',
          },
        };
      } else {
        newEl = {
          id: `el_${Date.now()}`,
          type,
          label: `New ${type}`,
          x: 50,
          y: 50,
          width: type === 'text' ? 200 : type === 'qr' ? 100 : 150,
          height: type === 'text' ? 30 : type === 'qr' ? 100 : 150,
          style: {
            fontSize: 14,
            color: '#000000',
            fontWeight: '400',
            backgroundColor: type === 'shape' ? '#cccccc' : undefined,
          },
        };
      }
      const newTemplate = { ...prev };
      if (designerSide === 'front') {
        newTemplate.frontElements = [...newTemplate.frontElements, newEl];
      } else {
        newTemplate.backElements = [...newTemplate.backElements, newEl];
      }
      setSelectedElementId(newEl.id);
      return newTemplate;
    });
  };

  const deleteElement = (id: string) => {
    setCurrentTemplate((prev) => {
      if (!prev) return null;
      const newTemplate = { ...prev };
      if (designerSide === 'front') {
        newTemplate.frontElements = newTemplate.frontElements.filter((e) => e.id !== id);
      } else {
        newTemplate.backElements = newTemplate.backElements.filter((e) => e.id !== id);
      }
      setSelectedElementId(null);
      return newTemplate;
    });
  };

  const duplicateElement = (el: CardElement) => {
    setCurrentTemplate((prev) => {
      if (!prev) return null;
      const newEl = { ...el, id: `el_${Date.now()}`, x: el.x + 20, y: el.y + 20 };
      const newTemplate = { ...prev };
      if (designerSide === 'front') {
        newTemplate.frontElements = [...newTemplate.frontElements, newEl];
      } else {
        newTemplate.backElements = [...newTemplate.backElements, newEl];
      }
      setSelectedElementId(newEl.id);
      return newTemplate;
    });
  };

  const handleSave = () => {
    if (!currentTemplate || !activeTemplate) return;

    if (currentTemplate.isBuiltIn) {
      // Save as new custom template
      const newTemplate: CardTemplate = {
        ...currentTemplate,
        id: `custom_${Date.now()}`,
        name: `${currentTemplate.name} (Custom)`,
        isBuiltIn: false,
        category: 'custom',
        createdAt: new Date().toISOString(),
      };
      addTemplate(newTemplate);
      useAppStore.getState().setActiveTemplate(newTemplate.id);
      showToast('Saved as new custom template!', 'success');
    } else {
      // Update existing custom template
      updateTemplate(currentTemplate.id, currentTemplate);
      showToast('Template updated!', 'success');
    }
    // Update local history base state
    reset(currentTemplate);
  };

  const handleDownloadTemplate = (template: CardTemplate) => {
    try {
      const exportable = {
        ...template,
        isBuiltIn: false,
        updatedAt: new Date().toISOString(),
      };
      const jsonString = JSON.stringify(exportable, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_template.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Template "${template.name}" exported successfully!`, 'success');
    } catch (error: any) {
      console.error('Failed to download template:', error);
      showToast(`Failed to export template: ${error.message || error}`, 'error');
    }
  };

  const moveElement = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setCurrentTemplate((prev) => {
        if (!prev) return null;
        const newTemplate = { ...prev };
        const sideElements =
          designerSide === 'front' ? [...newTemplate.frontElements] : [...newTemplate.backElements];
        const idx = sideElements.findIndex((el) => el.id === id);
        if (idx === -1) return prev;

        const newIdx = direction === 'up' ? idx + 1 : idx - 1;
        if (newIdx < 0 || newIdx >= sideElements.length) return prev;

        // Swap
        const temp = sideElements[idx];
        sideElements[idx] = sideElements[newIdx];
        sideElements[newIdx] = temp;

        if (designerSide === 'front') {
          newTemplate.frontElements = sideElements;
        } else {
          newTemplate.backElements = sideElements;
        }
        return newTemplate;
      });
    },
    [designerSide, setCurrentTemplate]
  );

  const reorderElements = useCallback(
    (newElements: CardElement[]) => {
      setCurrentTemplate((prev) => {
        if (!prev) return null;
        const newTemplate = { ...prev };
        if (designerSide === 'front') {
          newTemplate.frontElements = newElements;
        } else {
          newTemplate.backElements = newElements;
        }
        return newTemplate;
      });
    },
    [designerSide, setCurrentTemplate]
  );

  // Keyboard commands support (Undo, Redo, Duplicate, Delete, Save, Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in form inputs
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).contentEditable === 'true')
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 1. Undo / Redo
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
        return;
      }
      if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // 2. Duplicate element
      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedElement) duplicateElement(selectedElement);
        return;
      }

      // 3. Save template
      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // 4. Delete element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          if (confirm('Delete this element?')) {
            deleteElement(selectedElementId);
          }
        }
        return;
      }

      // 5. Arrow key nudges (move element)
      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
          dy = -step;
          e.preventDefault();
          break;
        case 'ArrowDown':
          dy = step;
          e.preventDefault();
          break;
        case 'ArrowLeft':
          dx = -step;
          e.preventDefault();
          break;
        case 'ArrowRight':
          dx = step;
          e.preventDefault();
          break;
        default:
          return;
      }

      if (dx !== 0 || dy !== 0) {
        if (selectedElementId) {
          const el = elements.find((x) => x.id === selectedElementId);
          if (el) {
            handleElementUpdate(selectedElementId, {
              x: el.x + dx,
              y: el.y + dy,
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedElementId,
    selectedElement,
    elements,
    handleElementUpdate,
    canUndo,
    canRedo,
    undo,
    redo,
    duplicateElement,
    deleteElement,
    handleSave,
  ]);

  const handleDiscard = () => {
    if (activeTemplate) {
      reset(activeTemplate);
      setSelectedElementId(null);
      showToast('Changes discarded', 'info');
    }
  };

  if (!activeTemplate || !currentTemplate) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No template selected</p>
          <p className="text-gray-400 text-sm mt-1">Select a template from the gallery first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <DesignerToolbar
        onAddElement={addElement}
        zoom={zoom}
        onZoomChange={setZoom}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Element Layers List */}
      <LayersPanel
        elements={elements}
        selectedElementId={selectedElementId}
        onSelectElement={setSelectedElementId}
        onMoveElement={moveElement}
        onDeleteElement={deleteElement}
        onReorderElements={reorderElements}
      />

      {/* Canvas Area */}
      <div className="flex-1 bg-gray-100/50 dark:bg-[hsl(222,47%,5%)] overflow-auto flex flex-col">
        {/* Top bar */}
        <div className="glass-panel border-b border-gray-200/10 px-4 py-2 flex items-center justify-between min-w-0 gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <span className="text-sm font-bold text-gray-900 dark:text-white min-w-0 flex-shrink flex items-center gap-1.5" title={currentTemplate.name}>
              <span className="truncate">{currentTemplate.name}</span>
              {canUndo && <span className="text-amber-500 text-[10px] whitespace-nowrap bg-amber-500/10 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20 flex-shrink-0">(Unsaved)</span>}
            </span>
            <div className="flex bg-gray-500/10 rounded-lg p-0.5">
              <button
                onClick={() => setDesignerSide('front')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  designerSide === 'front' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setDesignerSide('back')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  designerSide === 'back' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Back
              </button>
            </div>

            {/* Orientation Toggle */}
            <div className="flex bg-gray-500/10 rounded-lg p-0.5">
              <button
                onClick={() => {
                  if (currentTemplate.cardWidth > currentTemplate.cardHeight) {
                    setCurrentTemplate((prev) => {
                      if (!prev) return null;
                      const oldW = prev.cardWidth;
                      const oldH = prev.cardHeight;
                      const newW = 638;
                      const newH = 1010;
                      const scaleX = newW / oldW;
                      const scaleY = newH / oldH;
                      const rescale = (els: typeof prev.frontElements) =>
                        els.map((el) => ({
                          ...el,
                          x: Math.round(el.x * scaleX),
                          y: Math.round(el.y * scaleY),
                          width: Math.round(el.width * scaleX),
                          height: Math.round(el.height * scaleY),
                          style: {
                            ...el.style,
                            fontSize: el.style.fontSize
                              ? Math.round(el.style.fontSize * Math.min(scaleX, scaleY))
                              : el.style.fontSize,
                          },
                        }));
                      return {
                        ...prev,
                        cardWidth: newW,
                        cardHeight: newH,
                        frontElements: rescale(prev.frontElements),
                        backElements: rescale(prev.backElements),
                      };
                    });
                  }
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  currentTemplate.cardWidth <= currentTemplate.cardHeight ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Vertical
              </button>
              <button
                onClick={() => {
                  if (currentTemplate.cardWidth <= currentTemplate.cardHeight) {
                    setCurrentTemplate((prev) => {
                      if (!prev) return null;
                      const oldW = prev.cardWidth;
                      const oldH = prev.cardHeight;
                      const newW = 1010;
                      const newH = 638;
                      const scaleX = newW / oldW;
                      const scaleY = newH / oldH;
                      const rescale = (els: typeof prev.frontElements) =>
                        els.map((el) => ({
                          ...el,
                          x: Math.round(el.x * scaleX),
                          y: Math.round(el.y * scaleY),
                          width: Math.round(el.width * scaleX),
                          height: Math.round(el.height * scaleY),
                          style: {
                            ...el.style,
                            fontSize: el.style.fontSize
                              ? Math.round(el.style.fontSize * Math.min(scaleX, scaleY))
                              : el.style.fontSize,
                          },
                        }));
                      return {
                        ...prev,
                        cardWidth: newW,
                        cardHeight: newH,
                        frontElements: rescale(prev.frontElements),
                        backElements: rescale(prev.backElements),
                      };
                    });
                  }
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  currentTemplate.cardWidth > currentTemplate.cardHeight ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Horizontal
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {/* Always show Download button for current template design */}
            <button
              onClick={() => handleDownloadTemplate(currentTemplate)}
              className="px-3 py-1.5 glass-btn rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              title="Download Template File"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>
            {canUndo && (
              <>
                <button
                  onClick={handleDiscard}
                  className="px-3 py-1.5 glass-btn rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all active:scale-[0.97] flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <DesignerCanvas
          currentTemplate={currentTemplate}
          demoCard={demoCard}
          organization={organization}
          designerSide={designerSide}
          zoom={zoom}
          elements={elements}
          selectedElementId={selectedElementId}
          guides={guides}
          cardRef={cardRef}
          onMouseDown={handleMouseDown}
          onResizeStart={handleResizeStart}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {/* Properties Panel */}
      {selectedElement ? (
        <PropertiesPanel
          selectedElement={selectedElement}
          currentTemplate={currentTemplate}
          organization={organization}
          onElementUpdate={handleElementUpdate}
          onDuplicateElement={duplicateElement}
          onDeleteElement={deleteElement}
          cardData={demoCard}
        />
      ) : (
        <TemplatePropertiesPanel
          currentTemplate={currentTemplate}
          onUpdateTemplate={(updated) => setCurrentTemplate(updated)}
        />
      )}
    </div>
  );
};

export default CardDesigner;

import React, { useState, useCallback } from 'react';
import type { CardElement, CardTemplate } from '@/types';

interface UseDragResizeProps {
  currentTemplate: CardTemplate | null;
  elements: CardElement[];
  zoom: number;
  cardRef: React.RefObject<HTMLDivElement | null>;
  handleElementUpdate: (id: string, updates: Partial<CardElement>) => void;
  setSelectedElementId: (id: string | null) => void;
}

export function useDragResize({
  currentTemplate,
  elements,
  zoom,
  cardRef,
  handleElementUpdate,
  setSelectedElementId,
}: UseDragResizeProps) {
  const [draggedEl, setDraggedEl] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState<{ x?: number; y?: number }[]>([]);

  const handleMouseDown = (e: React.MouseEvent, elId: string) => {
    e.preventDefault();
    if (!currentTemplate) return;
    const el = elements.find((item) => item.id === elId);
    if (!el) return;

    // Get parent relative container to align coordinate spaces perfectly
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();

    setDragOffset({
      x: (e.clientX - parentRect.left) / zoom - el.x,
      y: (e.clientY - parentRect.top) / zoom - el.y,
    });
    setDraggedEl(elId);
    setSelectedElementId(elId);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedEl || !currentTemplate) return;
      const card = cardRef.current;
      if (!card) return;
      
      const parent = card.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();

      // Position in card-space coordinates relative to parent container
      let x = (e.clientX - rect.left) / zoom - dragOffset.x;
      let y = (e.clientY - rect.top) / zoom - dragOffset.y;
      x = Math.max(0, Math.round(x));
      y = Math.max(0, Math.round(y));

      const dragged = elements.find((item) => item.id === draggedEl);
      if (!dragged) return;

      const cardW = currentTemplate.cardWidth;
      const cardH = currentTemplate.cardHeight;
      const elW = dragged.width;
      const elH = dragged.height;
      const SNAP = 6; // snap threshold in card-px

      const newGuides: { x?: number; y?: number }[] = [];

      // ── Snap & guide targets ──
      const xTargets = [
        { val: 0, guide: 0 },                                // left edge
        { val: (cardW - elW) / 2, guide: cardW / 2 },        // center-x
        { val: cardW - elW, guide: cardW },                  // right edge
      ];
      const yTargets = [
        { val: 0, guide: 0 },
        { val: (cardH - elH) / 2, guide: cardH / 2 },
        { val: cardH - elH, guide: cardH },
      ];

      // Also snap to other elements edges
      elements.forEach((other) => {
        if (other.id === draggedEl) return;
        xTargets.push(
          { val: other.x, guide: other.x },
          { val: other.x + other.width, guide: other.x + other.width },
          { val: other.x - elW, guide: other.x },
          { val: other.x + (other.width - elW) / 2, guide: other.x + other.width / 2 }
        );
        yTargets.push(
          { val: other.y, guide: other.y },
          { val: other.y + other.height, guide: other.y + other.height },
          { val: other.y - elH, guide: other.y },
          { val: other.y + (other.height - elH) / 2, guide: other.y + other.height / 2 }
        );
      });

      for (const t of xTargets) {
        if (Math.abs(x - t.val) <= SNAP) {
          x = t.val;
          newGuides.push({ x: t.guide });
          break;
        }
      }
      for (const t of yTargets) {
        if (Math.abs(y - t.val) <= SNAP) {
          y = t.val;
          newGuides.push({ y: t.guide });
          break;
        }
      }

      setGuides(newGuides);
      handleElementUpdate(draggedEl, { x, y });
    },
    [draggedEl, dragOffset, zoom, handleElementUpdate, currentTemplate, elements, cardRef]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedEl(null);
    setGuides([]);
  }, []);

  return {
    draggedEl,
    guides,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}

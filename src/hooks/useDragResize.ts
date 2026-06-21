import React, { useState, useCallback } from 'react';
import type { CardElement, CardTemplate } from '@/types';

interface UseDragResizeProps {
  currentTemplate: CardTemplate | null;
  elements: CardElement[];
  zoom: number;
  cardRef: React.RefObject<HTMLDivElement | null>;
  handleElementUpdate: (id: string, updates: Partial<CardElement>, commitToHistory?: boolean) => void;
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
  const [hasCommittedStart, setHasCommittedStart] = useState(false);

  // State to track resize actions
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStartDims, setDragStartDims] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });

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
    setHasCommittedStart(false);
    setSelectedElementId(elId);
  };

  const handleResizeStart = (e: React.MouseEvent, elId: string, handle: string) => {
    e.preventDefault();
    e.stopPropagation(); // Avoid triggering translation drag
    if (!currentTemplate) return;
    const el = elements.find((item) => item.id === elId);
    if (!el) return;

    setActiveHandle(handle);
    setDraggedEl(elId);
    setHasCommittedStart(false);
    setDragStartDims({
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
    });
    setDragStartMouse({
      x: e.clientX,
      y: e.clientY,
    });
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

      const dragged = elements.find((item) => item.id === draggedEl);
      if (!dragged) return;

      const cardW = currentTemplate.cardWidth;
      const cardH = currentTemplate.cardHeight;
      const SNAP = 6; // snap threshold in card-px
      const MIN_SIZE = 15; // minimum allowed dimension

      let commit = false;
      if (!hasCommittedStart) {
        commit = true;
        setHasCommittedStart(true);
      }

      if (activeHandle) {
        // ─── RESIZING OPERATIONS ───
        const dx = (e.clientX - dragStartMouse.x) / zoom;
        const dy = (e.clientY - dragStartMouse.y) / zoom;

        let newX = dragStartDims.x;
        let newY = dragStartDims.y;
        let newW = dragStartDims.width;
        let newH = dragStartDims.height;

        const newGuides: { x?: number; y?: number }[] = [];

        // 1. Resize horizontally
        if (activeHandle.includes('right')) {
          newW = Math.max(MIN_SIZE, dragStartDims.width + dx);
          // Snap right edge to card border or other elements
          const rightTarget = newX + newW;
          let snappedRight = rightTarget;
          const xTargets = [cardW];
          elements.forEach((other) => {
            if (other.id === draggedEl) return;
            xTargets.push(other.x, other.x + other.width);
          });
          for (const target of xTargets) {
            if (Math.abs(rightTarget - target) <= SNAP) {
              snappedRight = target;
              newGuides.push({ x: target });
              break;
            }
          }
          newW = Math.max(MIN_SIZE, snappedRight - newX);
        } else if (activeHandle.includes('left')) {
          const maxLeft = dragStartDims.x + dragStartDims.width - MIN_SIZE;
          newX = Math.min(maxLeft, dragStartDims.x + dx);
          // Snap left edge
          let snappedLeft = newX;
          const xTargets = [0];
          elements.forEach((other) => {
            if (other.id === draggedEl) return;
            xTargets.push(other.x, other.x + other.width);
          });
          for (const target of xTargets) {
            if (Math.abs(newX - target) <= SNAP) {
              snappedLeft = target;
              newGuides.push({ x: target });
              break;
            }
          }
          newX = snappedLeft;
          newW = dragStartDims.width + (dragStartDims.x - newX);
        }

        // 2. Resize vertically
        if (activeHandle.includes('bottom')) {
          newH = Math.max(MIN_SIZE, dragStartDims.height + dy);
          // Snap bottom edge
          const bottomTarget = newY + newH;
          let snappedBottom = bottomTarget;
          const yTargets = [cardH];
          elements.forEach((other) => {
            if (other.id === draggedEl) return;
            yTargets.push(other.y, other.y + other.height);
          });
          for (const target of yTargets) {
            if (Math.abs(bottomTarget - target) <= SNAP) {
              snappedBottom = target;
              newGuides.push({ y: target });
              break;
            }
          }
          newH = Math.max(MIN_SIZE, snappedBottom - newY);
        } else if (activeHandle.includes('top')) {
          const maxTop = dragStartDims.y + dragStartDims.height - MIN_SIZE;
          newY = Math.min(maxTop, dragStartDims.y + dy);
          // Snap top edge
          let snappedTop = newY;
          const yTargets = [0];
          elements.forEach((other) => {
            if (other.id === draggedEl) return;
            yTargets.push(other.y, other.y + other.height);
          });
          for (const target of yTargets) {
            if (Math.abs(newY - target) <= SNAP) {
              snappedTop = target;
              newGuides.push({ y: target });
              break;
            }
          }
          newY = snappedTop;
          newH = dragStartDims.height + (dragStartDims.y - newY);
        }

        setGuides(newGuides);
        handleElementUpdate(draggedEl, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        }, commit);
      } else {
        // ─── TRANSLATION (DRAG MOVE) ───
        let x = (e.clientX - rect.left) / zoom - dragOffset.x;
        let y = (e.clientY - rect.top) / zoom - dragOffset.y;
        x = Math.max(0, Math.round(x));
        y = Math.max(0, Math.round(y));

        const elW = dragged.width;
        const elH = dragged.height;

        const newGuides: { x?: number; y?: number }[] = [];

        // Center / Edge Snap Targets
        const xTargets = [
          { val: 0, guide: 0 },
          { val: (cardW - elW) / 2, guide: cardW / 2 },
          { val: cardW - elW, guide: cardW },
        ];
        const yTargets = [
          { val: 0, guide: 0 },
          { val: (cardH - elH) / 2, guide: cardH / 2 },
          { val: cardH - elH, guide: cardH },
        ];

        // Snaps to other elements
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
        handleElementUpdate(draggedEl, {
          x: Math.round(x),
          y: Math.round(y),
        }, commit);
      }
    },
    [
      draggedEl,
      dragOffset,
      activeHandle,
      dragStartDims,
      dragStartMouse,
      zoom,
      handleElementUpdate,
      currentTemplate,
      elements,
      cardRef,
      hasCommittedStart,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedEl(null);
    setActiveHandle(null);
    setGuides([]);
    setHasCommittedStart(false);
  }, []);

  return {
    draggedEl,
    guides,
    handleMouseDown,
    handleResizeStart,
    handleMouseMove,
    handleMouseUp,
  };
}

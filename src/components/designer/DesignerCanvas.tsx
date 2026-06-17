import React, { useRef, useEffect } from 'react';
import CardRenderer from '../CardRenderer';
import type { CardElement, CardTemplate, Organization } from '@/types';

interface DesignerCanvasProps {
  currentTemplate: CardTemplate;
  demoCard: any;
  organization: Organization;
  designerSide: 'front' | 'back';
  zoom: number;
  elements: CardElement[];
  selectedElementId: string | null;
  guides: { x?: number; y?: number }[];
  cardRef: React.RefObject<HTMLDivElement | null>;
  onMouseDown: (e: React.MouseEvent, elId: string) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  currentTemplate,
  demoCard,
  organization,
  designerSide,
  zoom,
  elements,
  selectedElementId,
  guides,
  cardRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Sync cardRef to the actual card DOM element
  const innerCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef && 'current' in cardRef) {
      (cardRef as any).current = innerCardRef.current;
    }
  }, [cardRef]);

  return (
    <div
      id="designer-canvas"
      className="flex-1 overflow-auto flex items-start justify-center p-8"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      ref={canvasContainerRef}
    >
      <div
        style={{
          width: currentTemplate.cardWidth * zoom,
          height: currentTemplate.cardHeight * zoom,
          position: 'relative',
          // Ensure the container doesn't affect the inner scale
          flexShrink: 0,
        }}
      >
        {/* Card preview - exact same rendering as export */}
        <div
          ref={innerCardRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: currentTemplate.cardWidth,
            height: currentTemplate.cardHeight,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <CardRenderer
            template={currentTemplate}
            cardData={demoCard}
            organization={organization}
            side={designerSide}
            scale={1}
            style={{
              // Remove box shadow and border radius for cleaner design view
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              borderRadius: 0,
            }}
          />
        </div>

        {/* Selection overlays - perfectly aligned with rendered elements */}
        {elements.map((el) => {
          const isSelected = selectedElementId === el.id;
          return (
            <div
              key={el.id}
              onMouseDown={(e) => onMouseDown(e, el.id)}
              className={`absolute cursor-move transition-all duration-75 ${
                isSelected
                  ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                  : 'hover:bg-white/5'
              }`}
              style={{
                left: el.x * zoom,
                top: el.y * zoom,
                width: el.width * zoom,
                height: el.type === 'text'
                  ? Math.max(el.height * zoom, Math.ceil(((el.style.fontSize || 14) * (el.style.lineHeight || 1.4)) * zoom))
                  : el.height * zoom,
                zIndex: (el.zIndex || 1) + 1000, // Always above card content
                pointerEvents: 'auto',
              }}
              title={el.label}
            >
              {/* Selection handles for selected element */}
              {isSelected && (
                <>
                  {/* Corner handles */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  {/* Edge handles */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                </>
              )}
            </div>
          );
        })}

        {/* Alignment guide lines */}
        {guides.map((g, i) => (
          <React.Fragment key={i}>
            {g.x !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  left: g.x * zoom,
                  top: 0,
                  width: 1,
                  height: currentTemplate.cardHeight * zoom,
                  background: '#10b981',
                  pointerEvents: 'none',
                  zIndex: 10000,
                  opacity: 0.8,
                }}
              />
            )}
            {g.y !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  top: g.y * zoom,
                  left: 0,
                  height: 1,
                  width: currentTemplate.cardWidth * zoom,
                  background: '#10b981',
                  pointerEvents: 'none',
                  zIndex: 10000,
                  opacity: 0.8,
                }}
              />
            )}
          </React.Fragment>
        ))}

        {/* Canvas border outline */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: currentTemplate.cardWidth * zoom,
            height: currentTemplate.cardHeight * zoom,
            border: '1px dashed rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      </div>
    </div>
  );
};

export default DesignerCanvas;

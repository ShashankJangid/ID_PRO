import React, { useMemo } from 'react';
import type { CardTemplate, CardData, CardElement, Organization } from '@/types';
import { getFieldValue } from '@/store';

interface CardRendererProps {
  template: CardTemplate;
  cardData: CardData;
  organization: Organization;
  side: 'front' | 'back';
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Get image URL for image source */
function getImageUrl(
  el: CardElement,
  cardData: CardData,
  organization: Organization
): string | null {
  switch (el.imageSource) {
    case 'photo':
      return cardData.photo || null;
    case 'logo':
      return organization.logo || null;
    case 'signature1':
      return organization.signature1 || null;
    case 'signature2':
      return organization.signature2 || null;
    case 'custom':
      return el.staticImageUrl || null;
    default:
      return el.staticImageUrl || null;
  }
}

/** Generate QR code URL */
function getQRUrl(value: string): string {
  const text = encodeURIComponent(value || 'ID Card');
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${text}`;
}

/** Render a single card element */
function renderElement(
  el: CardElement,
  cardData: CardData,
  org: Organization
): React.ReactNode {
  const value = el.field ? getFieldValue(cardData, el.field, org) : '';
  const displayText = el.staticText || value || (el.field ? `[${el.label}]` : '');
  const imgUrl = el.imageSource ? getImageUrl(el, cardData, org) : (el.staticImageUrl || null);

  // For text elements, use minHeight so content is never clipped
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    ...(el.type === 'text'
      ? { minHeight: el.height, height: 'auto' }
      : { height: el.height }),
    zIndex: el.zIndex || 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    overflow: el.type === 'text' ? 'visible' : 'hidden',
  };

  const s = el.style;

  switch (el.type) {
    case 'text': {
      const textStyle: React.CSSProperties = {
        ...baseStyle,
        fontSize: s.fontSize || 14,
        fontFamily: s.fontFamily || 'Inter, sans-serif',
        fontWeight: s.fontWeight || '400',
        color: s.color || '#000',
        textAlign: (s.textAlign as any) || 'left',
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight || 1.4,
        textTransform: s.textTransform || 'none',
        display: 'block',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        backgroundColor: s.backgroundColor || 'transparent',
        borderRadius: s.borderRadius,
        padding: s.backgroundColor ? '4px 8px' : undefined,
      };
      return (
        <div key={el.id} style={textStyle}>
          {displayText}
        </div>
      );
    }

    case 'image': {
      if (imgUrl) {
        return (
          <img
            key={el.id}
            src={imgUrl}
            alt={el.label}
            style={{
              ...baseStyle,
              objectFit: (s.objectFit as any) || 'cover',
              borderRadius: s.borderRadius,
              border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor || '#000'}` : undefined,
              boxShadow: s.shadow,
            }}
          />
        );
      }
      // Placeholder
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            backgroundColor: '#f0f0f0',
            borderRadius: s.borderRadius,
            border: `2px dashed ${s.borderColor || '#ccc'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: '#999',
            textAlign: 'center',
          }}
        >
          {el.label}
        </div>
      );
    }

    case 'shape': {
      const shapeStyle: React.CSSProperties = {
        ...baseStyle,
        background: s.gradient || s.backgroundColor || '#ccc',
        opacity: s.opacity,
        borderRadius:
          s.shapeType === 'circle'
            ? '50%'
            : s.shapeType === 'rounded-rect'
            ? s.borderRadius || 12
            : s.borderRadius || 0,
        boxShadow: s.shadow,
      };
      return <div key={el.id} style={shapeStyle} />;
    }

    case 'qr': {
      const qrValue = el.field ? getFieldValue(cardData, el.field, org) : cardData.code || 'ID';
      return (
        <img
          key={el.id}
          src={getQRUrl(qrValue)}
          alt="QR Code"
          style={{
            ...baseStyle,
            backgroundColor: s.backgroundColor || '#fff',
            padding: 4,
            borderRadius: 4,
          }}
        />
      );
    }

    case 'barcode': {
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            backgroundColor: s.backgroundColor || '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: '#666',
            fontFamily: 'monospace',
          }}
        >
          ||| || ||| | || |||| ||
        </div>
      );
    }

    default:
      return null;
  }
}

const CardRenderer: React.FC<CardRendererProps> = ({
  template,
  cardData,
  organization,
  side,
  scale = 1,
  className = '',
  style = {},
}) => {
  const elements = side === 'front' ? template.frontElements : template.backElements;

  const cardStyle: React.CSSProperties = useMemo(
    () => ({
      width: template.cardWidth,
      height: template.cardHeight,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      borderRadius: 12,
      ...style,
    }),
    [template.cardWidth, template.cardHeight, scale, style]
  );

  return (
    <div className={className} style={cardStyle}>
      {elements.map((el) => renderElement(el, cardData, organization))}
    </div>
  );
};

export default React.memo(CardRenderer);

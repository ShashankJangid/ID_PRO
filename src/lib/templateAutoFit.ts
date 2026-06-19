/**
 * Template auto-fit utilities
 * When a user uploads a custom template or background image,
 * we scale all element positions/sizes to fit the standard ID card dimensions.
 * Standard portrait: 638 x 1010 px  |  Standard landscape: 1010 x 638 px
 */

import type { CardElement, CardTemplate } from '@/types';

const STANDARD_PORTRAIT_W = 638;
const STANDARD_PORTRAIT_H = 1010;
const STANDARD_LANDSCAPE_W = 1010;
const STANDARD_LANDSCAPE_H = 638;

/** Detect if a dimension set is landscape */
function isLandscape(w: number, h: number) {
  return w > h;
}

/** Get the standard target dimensions based on orientation */
export function getStandardDimensions(srcW: number, srcH: number): { w: number; h: number } {
  if (isLandscape(srcW, srcH)) {
    return { w: STANDARD_LANDSCAPE_W, h: STANDARD_LANDSCAPE_H };
  }
  return { w: STANDARD_PORTRAIT_W, h: STANDARD_PORTRAIT_H };
}

/** Scale all elements from source card dimensions to target dimensions */
export function rescaleElements(
  elements: CardElement[] | undefined,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): CardElement[] {
  if (!elements) return [];
  if (srcW === dstW && srcH === dstH) return elements;
  const sx = dstW / srcW;
  const sy = dstH / srcH;
  const fontScale = Math.min(sx, sy);

  return elements.map((el) => {
    const style = el.style || {};
    return {
      ...el,
      x: Math.round((el.x || 0) * sx),
      y: Math.round((el.y || 0) * sy),
      width: Math.round((el.width || 0) * sx),
      height: Math.round((el.height || 0) * sy),
      style: {
        ...style,
        fontSize: style.fontSize
          ? Math.round(style.fontSize * fontScale)
          : style.fontSize,
        letterSpacing: style.letterSpacing
          ? parseFloat((style.letterSpacing * fontScale).toFixed(2))
          : style.letterSpacing,
        borderRadius: style.borderRadius
          ? Math.round(style.borderRadius * fontScale)
          : style.borderRadius,
        borderWidth: style.borderWidth
          ? Math.max(1, Math.round(style.borderWidth * fontScale))
          : style.borderWidth,
      },
    };
  });
}

/** Auto-fit a template: if its card dimensions differ from standard, rescale everything */
export function autoFitTemplate(template: CardTemplate): CardTemplate {
  const { w: dstW, h: dstH } = getStandardDimensions(template.cardWidth, template.cardHeight);

  if (template.cardWidth === dstW && template.cardHeight === dstH) {
    return template; // already correct
  }

  return {
    ...template,
    cardWidth: dstW,
    cardHeight: dstH,
    frontElements: rescaleElements(
      template.frontElements,
      template.cardWidth,
      template.cardHeight,
      dstW,
      dstH
    ),
    backElements: rescaleElements(
      template.backElements,
      template.cardWidth,
      template.cardHeight,
      dstW,
      dstH
    ),
  };
}

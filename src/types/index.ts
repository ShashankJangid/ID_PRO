// ============================================
// ID Card Studio - Core Type Definitions
// ============================================

/** Supported element types on ID cards */
export type ElementType = 'text' | 'image' | 'shape' | 'qr' | 'barcode';

/** Shape sub-types */
export type ShapeType = 'rectangle' | 'circle' | 'line' | 'rounded-rect';

/** Text alignment */
export type TextAlign = 'left' | 'center' | 'right';

/** Font weight */
export type FontWeight = '300' | '400' | '500' | '600' | '700' | '800' | '900';

/** Card side */
export type CardSide = 'front' | 'back';

/** Built-in field names that map to card data */
export type DataField =
  | 'name'
  | 'role'
  | 'code'
  | 'dob'
  | 'blood'
  | 'contact'
  | 'address'
  | 'issued'
  | 'valid'
  | 'emergency'
  | 'orgName'
  | 'orgAddress'
  | 'orgPhone'
  | 'orgEmail'
  | 'custom1'
  | 'custom2'
  | 'custom3'
  | 'static';

/** Export format */
export type ExportFormat = 'pdf' | 'png' | 'print';

/** Shape style options */
export interface ShapeStyleOpts {
  backgroundColor?: string;
  gradient?: string;
  opacity?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: string;
}

/** Text style options */
export interface TextStyleOpts {
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  textAlign?: string;
  textTransform?: string;
  staticText?: string;
  letterSpacing?: number;
  fontFamily?: string;
  backgroundColor?: string;
  borderRadius?: number;
  lineHeight?: number;
}

// ─── Element Style ───
export interface ElementStyle {
  // Text
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  color?: string;
  textAlign?: TextAlign;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  // Image
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  // Shape
  shapeType?: ShapeType;
  backgroundColor?: string;
  gradient?: string;
  opacity?: number;
  // Common
  shadow?: string;
}

// ─── Card Element ───
export interface CardElement {
  id: string;
  type: ElementType;
  /** Data field this element binds to (null for static/decoratives) */
  field?: DataField;
  /** Static text content (for static text or labels) */
  staticText?: string;
  /** Display label for this element in the designer */
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: ElementStyle;
  /** For images: which image source */
  imageSource?: 'photo' | 'logo' | 'signature1' | 'signature2' | 'background' | 'custom';
  /** For custom images: base64 or URL uploaded in the designer */
  staticImageUrl?: string;
  /** Rotation in degrees */
  rotation?: number;
  /** Z-index */
  zIndex?: number;
}

// ─── Template Definition ───
export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'corporate' | 'school' | 'medical' | 'event' | 'minimal' | 'custom';
  /** Card dimensions in pixels */
  cardWidth: number;
  cardHeight: number;
  /** DPI for export (default 300) */
  dpi?: number;
  /** Front side elements */
  frontElements: CardElement[];
  /** Back side elements */
  backElements: CardElement[];
  /** Default field mappings for import */
  suggestedMappings?: Record<string, string[]>;
  /** Creation date */
  createdAt?: string;
  /** Whether this is a built-in template */
  isBuiltIn?: boolean;
}

// ─── Organization Profile ───
export interface Organization {
  name: string;
  tagline?: string;
  logo?: string; // base64 or URL
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  /** Primary brand color */
  primaryColor: string;
  /** Secondary brand color */
  secondaryColor: string;
  /** Accent color */
  accentColor: string;
  /** Signature images (base64) */
  signature1?: string;
  signature1Label?: string;
  signature2?: string;
  signature2Label?: string;
  /** Emergency contact number */
  emergencyContact?: string;
  /** Custom field definitions */
  customFields?: CustomFieldDef[];
}

export interface CustomFieldDef {
  key: string;
  label: string;
  defaultValue?: string;
}

// ─── Card Data (per person) ───
export interface CardData {
  id?: string;
  name: string;
  role: string;
  code: string;
  dob?: string;
  blood?: string;
  contact?: string;
  address?: string;
  issued?: string;
  valid?: string;
  emergency?: string;
  photo?: string; // base64 or URL
  custom1?: string;
  custom2?: string;
  custom3?: string;
  [key: string]: string | undefined;
}

// ─── Column Mapping for Import ───
export interface ColumnMapping {
  /** Excel column header */
  excelColumn: string;
  /** Our data field */
  field: DataField;
  /** Sample values */
  samples?: string[];
}

// ─── Import Preview ───
export interface ImportPreview {
  headers: string[];
  rows: string[][];
  mappings: ColumnMapping[];
  rowCount: number;
}

// ─── App State ───
export type AppTab =
  | 'dashboard'
  | 'organization'
  | 'templates'
  | 'designer'
  | 'data'
  | 'preview'
  | 'export';

export interface ExportJob {
  id: string;
  cardIndex: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  format: ExportFormat;
}

// ============================================
// ID Card Studio - Core Type Definitions
// ============================================

export type ElementType = 'text' | 'image' | 'shape' | 'qr' | 'barcode';
export type ShapeType = 'rectangle' | 'circle' | 'line' | 'rounded-rect';
export type TextAlign = 'left' | 'center' | 'right';
export type FontWeight = '300' | '400' | '500' | '600' | '700' | '800' | '900';
export type CardSide = 'front' | 'back';

export type DataField =
  | 'name' | 'role' | 'code' | 'dob' | 'blood' | 'contact'
  | 'address' | 'issued' | 'valid' | 'emergency'
  | 'orgName' | 'orgAddress' | 'orgPhone' | 'orgEmail' | 'orgWebsite' | 'orgTagline' | 'orgEmergency'
  | 'custom1' | 'custom2' | 'custom3'
  | 'static';

export type ExportFormat = 'pdf' | 'png' | 'print';

export interface ShapeStyleOpts {
  backgroundColor?: string; gradient?: string; opacity?: number;
  borderRadius?: number; borderWidth?: number; borderColor?: string; shadow?: string;
}

export interface TextStyleOpts {
  fontSize?: number; color?: string; fontWeight?: string; textAlign?: string;
  textTransform?: string; staticText?: string; letterSpacing?: number;
  fontFamily?: string; backgroundColor?: string; borderRadius?: number; lineHeight?: number;
}

export interface ElementStyle {
  fontSize?: number; fontFamily?: string; fontWeight?: FontWeight;
  color?: string; textAlign?: TextAlign; letterSpacing?: number; lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number; borderWidth?: number; borderColor?: string;
  shapeType?: ShapeType; backgroundColor?: string; gradient?: string;
  opacity?: number; shadow?: string;
}

export interface CardElement {
  id: string; type: ElementType; field?: DataField; staticText?: string;
  label: string; x: number; y: number; width: number; height: number;
  style: ElementStyle;
  imageSource?: 'photo' | 'logo' | 'signature1' | 'signature2' | 'background' | 'custom' | 'asset';
  /** For dynamic assets: index into organization.assets[] */
  assetIndex?: number;
  /** For dynamic signatures: index into organization.signatures[] */
  signatureIndex?: number;
  /** For dynamic logos: index into organization.logos[] */
  logoIndex?: number;
  staticImageUrl?: string; rotation?: number; zIndex?: number;
  /** QR code fields to include */
  qrFields?: QRFieldKey[];
}

export type QRFieldKey =
  | 'name' | 'role' | 'code' | 'dob' | 'blood' | 'contact'
  | 'address' | 'issued' | 'valid' | 'emergency'
  | 'orgName' | 'orgPhone' | 'orgEmail' | 'orgWebsite';

export const QR_FIELD_OPTIONS: { key: QRFieldKey; label: string }[] = [
  { key: 'name', label: 'Full Name' },
  { key: 'role', label: 'Role / Designation' },
  { key: 'code', label: 'ID Code / Roll No.' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'blood', label: 'Blood Group' },
  { key: 'contact', label: 'Contact Number' },
  { key: 'address', label: 'Address' },
  { key: 'issued', label: 'Issued Date' },
  { key: 'valid', label: 'Valid Until' },
  { key: 'emergency', label: 'Emergency Contact' },
  { key: 'orgName', label: 'Organization Name' },
  { key: 'orgPhone', label: 'Org Phone' },
  { key: 'orgEmail', label: 'Org Email' },
  { key: 'orgWebsite', label: 'Org Website' },
];

export interface CardTemplate {
  id: string; name: string; description: string;
  category: 'corporate' | 'school' | 'medical' | 'event' | 'minimal' | 'custom';
  cardWidth: number; cardHeight: number; dpi?: number;
  frontElements: CardElement[]; backElements: CardElement[];
  suggestedMappings?: Record<string, string[]>;
  createdAt?: string; isBuiltIn?: boolean;
  backgroundImage?: string; backgroundImageBack?: string;
  canvaEmbedUrl?: string; canvaEmbedUrlBack?: string;
}

/** An arbitrary uploadable asset (stamp, watermark, banner, etc.) */
export interface OrgAsset {
  key: string;      // unique key e.g. "asset1"
  label: string;    // display name in designer
  data: string;     // base64
}

/** A signature with label */
export interface OrgSignature {
  key: string;
  label: string;    // e.g. "Principal", "Director"
  data: string;     // base64
}

/** A logo with label */
export interface OrgLogo {
  key: string;
  label: string;    // e.g. "Main Logo", "Department Seal"
  data: string;     // base64
}

export interface Organization {
  name: string; tagline?: string;
  address?: string; city?: string; state?: string; pincode?: string;
  phone?: string; email?: string; website?: string; emergencyContact?: string;
  primaryColor: string; secondaryColor: string; accentColor: string;
  /** Toggle brand colors on/off */
  brandColorsEnabled?: boolean;
  /** Multiple logos */
  logos?: OrgLogo[];
  /** Multiple signatures */
  signatures?: OrgSignature[];
  /** Arbitrary assets (stamps, banners, etc.) */
  assets?: OrgAsset[];
  /** Legacy fields kept for compatibility */
  logo?: string;
  signature1?: string; signature1Label?: string;
  signature2?: string; signature2Label?: string;
  customFields?: CustomFieldDef[];
  /** QR code fields to show by default */
  defaultQRFields?: QRFieldKey[];
}

export interface CustomFieldDef {
  key: string; label: string; defaultValue?: string;
}

export interface CardData {
  id?: string; name: string; role: string; code: string;
  dob?: string; blood?: string; contact?: string;
  address?: string; issued?: string; valid?: string; emergency?: string;
  photo?: string;
  custom1?: string; custom2?: string; custom3?: string;
  [key: string]: string | undefined;
}

export interface ColumnMapping {
  excelColumn: string; field: DataField; samples?: string[];
}

export interface ImportPreview {
  headers: string[]; rows: string[][]; mappings: ColumnMapping[]; rowCount: number;
}

export type AppTab = 'dashboard' | 'organization' | 'templates' | 'designer' | 'data' | 'preview' | 'export';

export interface ExportJob {
  id: string; cardIndex: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  format: ExportFormat;
}

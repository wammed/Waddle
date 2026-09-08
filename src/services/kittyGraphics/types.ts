export interface KittyControlKeys {
  a?: 't' | 'T' | 'p' | 'd' | 'q'; // Action (default: 't')
  f?: 100 | 32 | 24; // Format: 100=PNG, 32=RGBA, 24=RGB (default: 32)
  t?: 'd' | 'f' | 't' | 's'; // Medium: 'd'=direct base64, 'f'=file (default: 'd')
  s?: number; // Image width in pixels
  v?: number; // Image height in pixels
  m?: 0 | 1; // More chunks: 0=last, 1=more follow (default: 0)
  i?: number; // Image ID
  I?: number; // Image number
  p?: number; // Placement ID
  q?: number; // Quiet: 1=suppress OK, 2=suppress failure
  c?: number; // Columns to occupy
  r?: number; // Rows to occupy
  X?: number; // Cell X offset in pixels
  Y?: number; // Cell Y offset in pixels
  C?: 0 | 1; // Cursor movement policy (0=move, 1=do not move, default: 0)
  z?: number; // Z-index (default: 0)
  d?: 'a' | 'i' | 'c' | 'p'; // Delete action target
  raw?: Record<string, string>;
}

export interface KittyCommand {
  keys: KittyControlKeys;
  payload: string;
}

export interface KittyImageRecord {
  id: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  byteSize: number; // width * height * 4 (RGBA)
  lastUsed: number;
}

export interface KittyPlacement {
  id: string;
  imageId: number;
  bufferLine: number; // Absolute line in scrollback buffer (baseY + cursorY)
  col: number; // Column index (0-indexed)
  cols: number; // Number of columns occupied
  rows: number; // Number of rows occupied
  xOffset: number; // Pixel X offset
  yOffset: number; // Pixel Y offset
  z: number; // Layering Z-index
}

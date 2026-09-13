export interface KittyControlKeys {
  a?: 't' | 'T' | 'p' | 'd' | 'q' | 'f' | 'a'; // Action: 't' (transmit), 'T' (place), 'p' (place id), 'd' (delete), 'q' (query), 'f' (frame), 'a' (animation control)
  f?: 100 | 32 | 24; // Format: 100=PNG, 32=RGBA, 24=RGB (default: 32)
  t?: 'd' | 'f' | 't' | 's'; // Medium: 'd'=direct base64, 'f'=file, 't'=temp file, 's'=shared memory (default: 'd')
  s?: number; // Image width in pixels OR animation state (1=stop, 2=loading, 3=run)
  v?: number; // Image height in pixels OR animation loop count (default: 0 = infinite loop)
  S?: number; // Payload size in bytes
  m?: 0 | 1; // More chunks: 0=last, 1=more follow (default: 0)
  i?: number; // Image ID
  I?: number; // Image number
  p?: number; // Placement ID
  q?: number; // Quiet: 0=silent (default), 1=error only, 2=always respond (OK & error)
  c?: number; // Columns to occupy
  r?: number; // Rows to occupy OR 1-based frame number
  X?: number; // Cell X offset in pixels
  Y?: number; // Cell Y offset in pixels
  C?: 0 | 1; // Cursor movement policy (0=move, 1=do not move, default: 0)
  z?: number; // Z-index OR animation frame delay/gap in ms
  d?: 'a' | 'i' | 'c' | 'p'; // Delete action target
  x?: number; // Sub-rectangle X offset in source image (pixels)
  y?: number; // Sub-rectangle Y offset in source image (pixels)
  w?: number; // Sub-rectangle width in source image (pixels)
  h?: number; // Sub-rectangle height in source image (pixels)
  U?: number; // Virtual placement flag (1 = virtual placement for Unicode placeholders)
  o?: 'z'; // Compression: 'z' = zlib deflate
  raw?: Record<string, string>;
}

export interface KittyAnimationFrame {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  byteSize: number;
  delayMs: number; // Frame display duration in milliseconds (default: 40ms)
}

export interface KittyAnimationState {
  loopCount: number; // 0 = infinite loop (default), >0 = finite count
  loopsCompleted: number;
  currentFrameIndex: number;
  isPlaying: boolean;
  timer?: any; // setTimeout timer handle
}

export interface KittyCommand {
  keys: KittyControlKeys;
  payload: string;
  startCol?: number;
  startBufferLine?: number;
  cols?: number;
  rows?: number;
}

export interface KittyImageRecord {
  id: number;
  format?: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  byteSize: number; // width * height * 4 (RGBA)
  lastUsed: number;
  frames?: KittyAnimationFrame[];
  animation?: KittyAnimationState;
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
  srcX?: number; // Source sub-rectangle X (pixels)
  srcY?: number; // Source sub-rectangle Y (pixels)
  srcWidth?: number; // Source sub-rectangle width (pixels)
  srcHeight?: number; // Source sub-rectangle height (pixels)
}

export interface KittyVirtualPlacement {
  imageId: number;
  cols: number;
  rows: number;
  srcX?: number;
  srcY?: number;
  srcWidth?: number;
  srcHeight?: number;
}

/**
 * Kitty Graphics Protocol Unicode Placeholder Support (U+10EEEE).
 *
 * Implements decoding of diacritic combining marks for grid row/column indexing,
 * foreground-color image ID extraction, and sub-rectangle UV mapping.
 */

export const PLACEHOLDER_CODEPOINT = 0x10eeee;

/**
 * The 297 standard combining diacritic codepoints defined in the Kitty Graphics Protocol
 * (derived from UnicodeData.txt class 230 non-spacing marks without decomposition).
 * Index in this array represents the integer row / column / highByte value (0..296).
 */
export const ROW_COLUMN_DIACRITICS: number[] = [
  0x305, 0x30d, 0x30e, 0x310, 0x312, 0x33d, 0x33e, 0x33f, 0x346, 0x34a,
  0x34b, 0x34c, 0x350, 0x351, 0x352, 0x357, 0x35b, 0x363, 0x364, 0x365,
  0x366, 0x367, 0x368, 0x369, 0x36a, 0x36b, 0x36c, 0x36d, 0x36e, 0x36f,
  0x483, 0x484, 0x485, 0x486, 0x487, 0x592, 0x593, 0x594, 0x595, 0x597,
  0x598, 0x599, 0x59c, 0x59d, 0x59e, 0x59f, 0x5a0, 0x5a1, 0x5a8, 0x5a9,
  0x5ab, 0x5ac, 0x5af, 0x5c4, 0x610, 0x611, 0x612, 0x613, 0x614, 0x615,
  0x616, 0x617, 0x657, 0x658, 0x659, 0x65a, 0x65b, 0x65d, 0x65e, 0x6d6,
  0x6d7, 0x6d8, 0x6d9, 0x6da, 0x6db, 0x6dc, 0x6df, 0x6e0, 0x6e1, 0x6e2,
  0x6e4, 0x6e7, 0x6e8, 0x6eb, 0x6ec, 0x730, 0x732, 0x733, 0x735, 0x736,
  0x73a, 0x73d, 0x73f, 0x740, 0x741, 0x743, 0x745, 0x747, 0x749, 0x74a,
  0x7eb, 0x7ec, 0x7ed, 0x7ee, 0x7ef, 0x7f0, 0x7f1, 0x7f3, 0x816, 0x817,
  0x818, 0x819, 0x81b, 0x81c, 0x81d, 0x81e, 0x81f, 0x820, 0x821, 0x822,
  0x823, 0x825, 0x826, 0x827, 0x829, 0x82a, 0x82b, 0x82c, 0x82d, 0x951,
  0x953, 0x954, 0xf82, 0xf83, 0xf86, 0xf87, 0x135d, 0x135e, 0x135f, 0x17dd,
  0x193a, 0x1a17, 0x1a75, 0x1a76, 0x1a77, 0x1a78, 0x1a79, 0x1a7a, 0x1a7b, 0x1a7c,
  0x1b6b, 0x1b6d, 0x1b6e, 0x1b6f, 0x1b70, 0x1b71, 0x1b72, 0x1b73, 0x1cd0, 0x1cd1,
  0x1cd2, 0x1cda, 0x1cdb, 0x1ce0, 0x1dc0, 0x1dc1, 0x1dc3, 0x1dc4, 0x1dc5, 0x1dc6,
  0x1dc7, 0x1dc8, 0x1dc9, 0x1dcb, 0x1dcc, 0x1dd1, 0x1dd2, 0x1dd3, 0x1dd4, 0x1dd5,
  0x1dd6, 0x1dd7, 0x1dd8, 0x1dd9, 0x1dda, 0x1ddb, 0x1ddc, 0x1ddd, 0x1dde, 0x1ddf,
  0x1de0, 0x1de1, 0x1de2, 0x1de3, 0x1de4, 0x1de5, 0x1de6, 0x1dfe, 0x20d0, 0x20d1,
  0x20d4, 0x20d5, 0x20d6, 0x20d7, 0x20db, 0x20dc, 0x20e1, 0x20e7, 0x20e9, 0x20f0,
  0x2cef, 0x2cf0, 0x2cf1, 0x2de0, 0x2de1, 0x2de2, 0x2de3, 0x2de4, 0x2de5, 0x2de6,
  0x2de7, 0x2de8, 0x2de9, 0x2dea, 0x2deb, 0x2dec, 0x2ded, 0x2dee, 0x2def, 0x2df0,
  0x2df1, 0x2df2, 0x2df3, 0x2df4, 0x2df5, 0x2df6, 0x2df7, 0x2df8, 0x2df9, 0x2dfa,
  0x2dfb, 0x2dfc, 0x2dfd, 0x2dfe, 0x2dff, 0xa66f, 0xa67c, 0xa67d, 0xa6f0, 0xa6f1,
  0xa8e0, 0xa8e1, 0xa8e2, 0xa8e3, 0xa8e4, 0xa8e5, 0xa8e6, 0xa8e7, 0xa8e8, 0xa8e9,
  0xa8ea, 0xa8eb, 0xa8ec, 0xa8ed, 0xa8ee, 0xa8ef, 0xa8f0, 0xa8f1, 0xaab0, 0xaab2,
  0xaab3, 0xaab7, 0xaab8, 0xaabe, 0xaabf, 0xaac1, 0xfe20, 0xfe21, 0xfe22, 0xfe23,
  0xfe24, 0xfe25, 0xfe26, 0x10a0f, 0x10a38, 0x1d185, 0x1d186, 0x1d187, 0x1d188, 0x1d189,
  0x1d1aa, 0x1d1ab, 0x1d1ac, 0x1d1ad, 0x1d242, 0x1d243, 0x1d244,
];

export const DIACRITIC_TO_INDEX: Map<number, number> = new Map(
  ROW_COLUMN_DIACRITICS.map((cp, idx) => [cp, idx])
);

export interface DecodedPlaceholder {
  imageId: number;
  imageIdBase: number;
  row: number;
  col: number;
  highByte: number;
}

export interface PlaceholderUV {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Symbol flag used to mark cells as Kitty Graphic Placeholders in the renderer pipeline.
 */
export const IS_GRAPHIC_PLACEHOLDER = Symbol('IS_GRAPHIC_PLACEHOLDER');

/**
 * Checks whether a given xterm cell is a Kitty Unicode placeholder (U+10EEEE).
 * When detected, tags the cell with the IS_GRAPHIC_PLACEHOLDER state flag.
 */
export function isPlaceholderCell(cell: any): boolean {
  if (!cell) return false;
  if (cell[IS_GRAPHIC_PLACEHOLDER] === true || cell.isGraphicPlaceholder === true) return true;
  const code = typeof cell.getCode === 'function' ? cell.getCode() : 0;
  if (code === PLACEHOLDER_CODEPOINT) {
    cell[IS_GRAPHIC_PLACEHOLDER] = true;
    cell.isGraphicPlaceholder = true;
    return true;
  }
  const chars = typeof cell.getChars === 'function' ? cell.getChars() : '';
  if (chars && chars.codePointAt(0) === PLACEHOLDER_CODEPOINT) {
    cell[IS_GRAPHIC_PLACEHOLDER] = true;
    cell.isGraphicPlaceholder = true;
    return true;
  }
  return false;
}

/**
 * Decodes a Kitty Unicode placeholder cell:
 * - Codepoint: U+10EEEE
 * - Diacritic 0 (first combining char): row index (0..296)
 * - Diacritic 1 (second combining char): column index (0..296)
 * - Diacritic 2 (third combining char): high byte of image ID (highByte << 24)
 * - Foreground color: 24-bit RGB or 256-color palette image ID
 *
 * Implements left-to-right inheritance for omitted diacritics according to the Kitty protocol spec.
 */
export function decodePlaceholderCell(
  cell: any,
  prevPlaceholder?: DecodedPlaceholder | null,
  fallbackImageId?: number
): DecodedPlaceholder | null {
  if (!isPlaceholderCell(cell)) return null;

  const chars = typeof cell.getChars === 'function' ? cell.getChars() : '';
  const codepoints = [...chars].map((c) => c.codePointAt(0)!);

  // codepoints[0] is PLACEHOLDER_CODEPOINT (0x10EEEE)
  const d0 = codepoints[1]; // row diacritic
  const d1 = codepoints[2]; // col diacritic
  const d2 = codepoints[3]; // imageId high byte diacritic

  // Extract base image ID from cell foreground color
  let imageIdBase = 0;
  if (typeof cell.isFgRGB === 'function' && cell.isFgRGB()) {
    imageIdBase = cell.getFgColor();
  } else if (typeof cell.isFgPalette === 'function' && cell.isFgPalette()) {
    imageIdBase = cell.getFgColor();
  }

  let row = 0;
  let col = 0;
  let highByte = 0;

  const hasD0 = d0 !== undefined && DIACRITIC_TO_INDEX.has(d0);
  const hasD1 = d1 !== undefined && DIACRITIC_TO_INDEX.has(d1);
  const hasD2 = d2 !== undefined && DIACRITIC_TO_INDEX.has(d2);

  if (hasD0 && hasD1) {
    row = DIACRITIC_TO_INDEX.get(d0)!;
    col = DIACRITIC_TO_INDEX.get(d1)!;
    if (hasD2) {
      highByte = DIACRITIC_TO_INDEX.get(d2)!;
    } else if (
      prevPlaceholder &&
      prevPlaceholder.imageIdBase === imageIdBase &&
      prevPlaceholder.row === row &&
      prevPlaceholder.col === col - 1
    ) {
      highByte = prevPlaceholder.highByte;
    }
  } else if (hasD0) {
    // Only row diacritic is present
    row = DIACRITIC_TO_INDEX.get(d0)!;
    if (
      prevPlaceholder &&
      prevPlaceholder.imageIdBase === imageIdBase &&
      prevPlaceholder.row === row
    ) {
      col = prevPlaceholder.col + 1;
      highByte = prevPlaceholder.highByte;
    } else {
      col = 0;
      highByte = 0;
    }
  } else {
    // No diacritics present: inherit from preceding placeholder cell if same image
    if (prevPlaceholder && prevPlaceholder.imageIdBase === imageIdBase) {
      row = prevPlaceholder.row;
      col = prevPlaceholder.col + 1;
      highByte = prevPlaceholder.highByte;
    } else {
      row = 0;
      col = 0;
      highByte = 0;
    }
  }

  let imageId = highByte > 0 ? (highByte << 24) | imageIdBase : imageIdBase;
  if (imageId === 0 && fallbackImageId !== undefined && fallbackImageId > 0) {
    imageId = fallbackImageId;
  }

  return {
    imageId,
    imageIdBase,
    row,
    col,
    highByte,
  };
}

/**
 * Computes source bitmap pixel coordinates for a specific placeholder tile cell (col, row)
 * taking into account total grid rows/cols and any sub-rectangle clipping (srcX, srcY, srcWidth, srcHeight).
 */
export function computePlaceholderUV(
  row: number,
  col: number,
  totalRows: number,
  totalCols: number,
  bmpWidth: number,
  bmpHeight: number,
  srcX: number = 0,
  srcY: number = 0,
  srcWidth?: number,
  srcHeight?: number
): PlaceholderUV {
  const effectiveSrcW =
    srcWidth !== undefined && srcWidth > 0
      ? Math.min(bmpWidth - srcX, srcWidth)
      : Math.max(1, bmpWidth - srcX);
  const effectiveSrcH =
    srcHeight !== undefined && srcHeight > 0
      ? Math.min(bmpHeight - srcY, srcHeight)
      : Math.max(1, bmpHeight - srcY);

  const numCols = Math.max(1, totalCols);
  const numRows = Math.max(1, totalRows);

  const u1 = Math.max(0, Math.min(1, col / numCols));
  const u2 = Math.max(0, Math.min(1, (col + 1) / numCols));
  const v1 = Math.max(0, Math.min(1, row / numRows));
  const v2 = Math.max(0, Math.min(1, (row + 1) / numRows));

  const sx = Math.max(0, Math.min(bmpWidth, srcX + u1 * effectiveSrcW));
  const sy = Math.max(0, Math.min(bmpHeight, srcY + v1 * effectiveSrcH));
  const sw = Math.max(0, Math.min(bmpWidth - sx, (u2 - u1) * effectiveSrcW));
  const sh = Math.max(0, Math.min(bmpHeight - sy, (v2 - v1) * effectiveSrcH));

  return { sx, sy, sw, sh };
}

import { describe, it, expect } from 'vitest';
import {
  isPlaceholderCell,
  decodePlaceholderCell,
  computePlaceholderUV,
  PLACEHOLDER_CODEPOINT,
  ROW_COLUMN_DIACRITICS,
} from '../unicodePlaceholder';

describe('unicodePlaceholder', () => {
  it('correctly identifies U+10EEEE placeholder cells', () => {
    const placeholderCell = {
      getCode: () => PLACEHOLDER_CODEPOINT,
      isCombined: () => 0,
      getChars: () => '\u{10EEEE}',
    };
    expect(isPlaceholderCell(placeholderCell)).toBe(true);

    const asciiCell = {
      getCode: () => 65, // 'A'
      isCombined: () => 0,
      getChars: () => 'A',
    };
    expect(isPlaceholderCell(asciiCell)).toBe(false);
  });

  it('protects against workCell combinedData pollution on normal cells', () => {
    // xterm reuses workCell with residual combinedData but isCombined() === 0
    const pollutedNormalCell = {
      getCode: () => 66, // 'B'
      isCombined: () => 0,
      combinedData: '\u{10EEEE}\u0305', // dirty remnant from previous cell
      getChars: () => 'B',
    };
    expect(isPlaceholderCell(pollutedNormalCell)).toBe(false);
  });

  it('decodes row and column combining diacritics', () => {
    // Diacritic for row 1, col 2
    const dRow = String.fromCodePoint(ROW_COLUMN_DIACRITICS[1]);
    const dCol = String.fromCodePoint(ROW_COLUMN_DIACRITICS[2]);
    const charStr = `\u{10EEEE}${dRow}${dCol}`;

    const cell = {
      getCode: () => PLACEHOLDER_CODEPOINT,
      isCombined: () => 1,
      getChars: () => charStr,
      getFgColor: () => 0x010203, // RGB foreground -> ID
      getFgColorMode: () => 2, // RGB mode
    };

    const decoded = decodePlaceholderCell(cell);
    expect(decoded).not.toBeNull();
    expect(decoded!.row).toBe(1);
    expect(decoded!.col).toBe(2);
    expect(decoded!.hasDiacritics).toBe(true);
  });

  it('computes correct UV bounds for grid cells', () => {
    // 2 rows x 4 cols grid (row=0, col=0)
    const uv = computePlaceholderUV(
      0, // row
      0, // col
      2, // totalRows
      4, // totalCols
      400, // img width
      200 // img height
    );

    expect(uv.u1).toBe(0);
    expect(uv.v1).toBe(0);
    expect(uv.u2).toBe(0.25);
    expect(uv.v2).toBe(0.5);
    expect(uv.sw).toBe(100);
    expect(uv.sh).toBe(100);
  });
});

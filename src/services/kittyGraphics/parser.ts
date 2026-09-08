import { KittyCommand, KittyControlKeys } from './types';

export class KittyApcParser {
  private buffer: string = '';
  private pendingChunkKeys: KittyControlKeys | null = null;
  private pendingChunkPayload: string = '';
  private maxPayloadBytes: number;

  constructor(maxPayloadMb: number = 16) {
    this.maxPayloadBytes = maxPayloadMb * 1024 * 1024;
  }

  public setMaxPayloadMb(mb: number) {
    this.maxPayloadBytes = Math.max(4, Math.min(64, mb)) * 1024 * 1024;
  }

  /**
   * Processes an incoming raw chunk from PTY.
   * Strips all Kitty APC sequences so the terminal doesn't choke on Base64,
   * and yields parsed, reassembled Kitty commands.
   */
  public parse(chunk: string): { cleanText: string; commands: KittyCommand[] } {
    let input = this.buffer + chunk;
    this.buffer = '';

    let cleanText = '';
    const commands: KittyCommand[] = [];

    let i = 0;
    const len = input.length;

    while (i < len) {
      // Look for APC initiator ESC _ G (\x1b_G)
      const apcIdx = input.indexOf('\x1b_G', i);
      if (apcIdx === -1) {
        // Check if there is a trailing partial initiator (e.g. ends with \x1b or \x1b_)
        if (input.endsWith('\x1b') || input.endsWith('\x1b_')) {
          const cutIdx = input.endsWith('\x1b_') ? len - 2 : len - 1;
          cleanText += input.slice(i, cutIdx);
          this.buffer = input.slice(cutIdx);
        } else {
          cleanText += input.slice(i);
        }
        break;
      }

      // Add text before APC initiator to clean terminal output
      cleanText += input.slice(i, apcIdx);

      // Search for terminator: either \x1b\ (ST) or \x07 (BEL)
      let endIdx = -1;
      let termLen = 0;

      const stIdx = input.indexOf('\x1b\\', apcIdx + 3);
      const belIdx = input.indexOf('\x07', apcIdx + 3);

      if (stIdx !== -1 && belIdx !== -1) {
        if (stIdx < belIdx) {
          endIdx = stIdx;
          termLen = 2;
        } else {
          endIdx = belIdx;
          termLen = 1;
        }
      } else if (stIdx !== -1) {
        endIdx = stIdx;
        termLen = 2;
      } else if (belIdx !== -1) {
        endIdx = belIdx;
        termLen = 1;
      }

      if (endIdx === -1) {
        // Sequence is incomplete across this chunk! Retain in buffer.
        this.buffer = input.slice(apcIdx);
        break;
      }

      // Extract APC sequence body (between \x1b_G and terminator)
      const sequenceBody = input.slice(apcIdx + 3, endIdx);
      i = endIdx + termLen;

      // Parse APC body: <keys>;<payload>
      const semiIdx = sequenceBody.indexOf(';');
      let keysStr = sequenceBody;
      let payload = '';

      if (semiIdx !== -1) {
        keysStr = sequenceBody.slice(0, semiIdx);
        payload = sequenceBody.slice(semiIdx + 1);
      }

      const keys = this.parseControlKeys(keysStr);

      // Handle chunking: m=1 (more follow) vs m=0 (last chunk)
      if (keys.m === 1) {
        if (!this.pendingChunkKeys) {
          this.pendingChunkKeys = keys;
          this.pendingChunkPayload = payload;
        } else {
          this.pendingChunkPayload += payload;
        }

        // Safety check: abort if accumulated payload exceeds max size
        if (this.pendingChunkPayload.length > this.maxPayloadBytes) {
          console.warn('Kitty payload exceeded max allowed size, dropping buffer');
          this.pendingChunkKeys = null;
          this.pendingChunkPayload = '';
        }
      } else {
        // Final or unchunked payload
        if (this.pendingChunkKeys) {
          const mergedKeys: KittyControlKeys = {
            ...this.pendingChunkKeys,
            ...keys,
            m: 0,
          };
          const fullPayload = this.pendingChunkPayload + payload;
          this.pendingChunkKeys = null;
          this.pendingChunkPayload = '';

          if (fullPayload.length <= this.maxPayloadBytes) {
            commands.push({ keys: mergedKeys, payload: fullPayload });
          } else {
            console.warn('Kitty payload exceeded max allowed size on completion, dropping');
          }
        } else {
          if (payload.length <= this.maxPayloadBytes) {
            commands.push({ keys, payload });
          } else {
            console.warn('Kitty direct payload exceeded max allowed size, dropping');
          }
        }
      }
    }

    return { cleanText, commands };
  }

  private parseControlKeys(keysStr: string): KittyControlKeys {
    const result: KittyControlKeys = { raw: {} };
    if (!keysStr.trim()) return result;

    const parts = keysStr.split(',');
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) continue;

      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      if (result.raw) result.raw[key] = val;

      switch (key) {
        case 'a':
          if (['t', 'T', 'p', 'd', 'q'].includes(val)) {
            result.a = val as any;
          }
          break;
        case 'f':
          const fNum = parseInt(val, 10);
          if (fNum === 100 || fNum === 32 || fNum === 24) {
            result.f = fNum;
          }
          break;
        case 't':
          if (['d', 'f', 't', 's'].includes(val)) {
            result.t = val as any;
          }
          break;
        case 's':
          result.s = parseInt(val, 10);
          break;
        case 'v':
          result.v = parseInt(val, 10);
          break;
        case 'm':
          result.m = parseInt(val, 10) === 1 ? 1 : 0;
          break;
        case 'i':
          result.i = parseInt(val, 10);
          break;
        case 'I':
          result.I = parseInt(val, 10);
          break;
        case 'p':
          result.p = parseInt(val, 10);
          break;
        case 'q':
          result.q = parseInt(val, 10);
          break;
        case 'c':
          result.c = parseInt(val, 10);
          break;
        case 'r':
          result.r = parseInt(val, 10);
          break;
        case 'X':
          result.X = parseInt(val, 10);
          break;
        case 'Y':
          result.Y = parseInt(val, 10);
          break;
        case 'C':
          result.C = parseInt(val, 10) === 1 ? 1 : 0;
          break;
        case 'z':
          result.z = parseInt(val, 10);
          break;
        case 'd':
          if (['a', 'i', 'c', 'p'].includes(val)) {
            result.d = val as any;
          }
          break;
      }
    }

    return result;
  }
}

/**
 * Safe clipboard service supporting Tauri native clipboard manager (Wayland / X11 direct)
 * with seamless fallback to navigator.clipboard and execCommand.
 */
import { isTauri } from './tauriApi';

let tauriClipboardModule: typeof import('@tauri-apps/plugin-clipboard-manager') | null = null;

async function getTauriClipboard() {
  if (!isTauri()) return null;
  if (!tauriClipboardModule) {
    try {
      tauriClipboardModule = await import('@tauri-apps/plugin-clipboard-manager');
    } catch (e) {
      console.warn('Failed to load @tauri-apps/plugin-clipboard-manager:', e);
    }
  }
  return tauriClipboardModule;
}

export async function writeClipboardText(text: string): Promise<boolean> {
  if (!text) return true;

  let nativeSuccess = false;

  // 1. Priority: Tauri native clipboard manager (Wayland / X11 OS-level clipboard direct)
  try {
    const cb = await getTauriClipboard();
    if (cb && cb.writeText) {
      await cb.writeText(text);
      nativeSuccess = true;
    }
  } catch (err) {
    console.warn('Tauri native clipboard write failed, continuing to web fallback:', err);
  }

  // 2. Also write to web standard navigator.clipboard to ensure WebKitGTK internal selection is in sync
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('navigator.clipboard.writeText fallback failed:', e);
  }

  if (nativeSuccess) {
    return true;
  }

  // 3. Fallback for restricted WebKit environments
  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error('writeClipboardText fallback failed:', err);
  }

  return false;
}

export async function readClipboardText(): Promise<string> {
  // 1. Priority: Tauri native clipboard manager (reads directly from Wayland / X11 OS clipboard)
  try {
    const cb = await getTauriClipboard();
    if (cb && cb.readText) {
      const text = await cb.readText();
      if (typeof text === 'string' && text.length > 0) {
        return text;
      }
    }
  } catch (err) {
    console.warn('Tauri native clipboard read failed, trying web fallback:', err);
  }

  // 2. Web standard navigator.clipboard fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (typeof text === 'string' && text.length > 0) {
        return text;
      }
    } catch (e) {
      console.warn('navigator.clipboard.readText fallback failed:', e);
    }
  }

  return '';
}

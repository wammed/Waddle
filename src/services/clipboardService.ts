/**
 * Safe clipboard service supporting Tauri native clipboard (Wayland multi-MIME + GTK direct)
 * with seamless fallback to Tauri clipboard plugin, navigator.clipboard, and execCommand.
 */
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauriApi';

export async function writeClipboardText(text: string): Promise<boolean> {
  if (!text) return true;

  let nativeSuccess = false;

  // 1. High Priority: Dedicated Linux Wayland multi-MIME & GTK clipboard
  if (isTauri()) {
    try {
      await invoke('native_clipboard_write', { text });
      nativeSuccess = true;
    } catch (err) {
      console.warn('Native clipboard write failed, trying plugin:', err);
    }
  }

  // 2. Tauri official clipboard manager plugin
  if (isTauri() && !nativeSuccess) {
    try {
      await invoke('plugin:clipboard-manager|write_text', { text });
      nativeSuccess = true;
    } catch (err) {
      console.warn('Tauri plugin clipboard write failed:', err);
    }
  }

  // 3. Web standard navigator.clipboard (WebKitGTK internal sync)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Non-fatal fallback
  }

  if (nativeSuccess) {
    return true;
  }

  // 4. Fallback for restricted WebKit environments
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
  // 1. High Priority: Dedicated Linux Wayland multi-MIME & GTK clipboard
  if (isTauri()) {
    try {
      const text = await invoke<string>('native_clipboard_read');
      if (typeof text === 'string' && text.length > 0) {
        return text;
      }
    } catch (err) {
      console.warn('Native clipboard read failed, trying plugin:', err);
    }
  }

  // 2. Tauri official clipboard manager plugin
  if (isTauri()) {
    try {
      const text = await invoke<string>('plugin:clipboard-manager|read_text');
      if (typeof text === 'string' && text.length > 0) {
        return text;
      }
    } catch (err) {
      console.warn('Tauri plugin clipboard read failed:', err);
    }
  }

  // 3. Web standard navigator.clipboard fallback
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

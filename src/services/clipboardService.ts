/**
 * Safe clipboard service supporting navigator.clipboard with fallback.
 */

export async function writeClipboardText(text: string): Promise<boolean> {
  if (!text) return true;

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText failed, using fallback:', e);
    }
  }

  // Fallback for environments where navigator.clipboard might be restricted
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
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch (e) {
      console.warn('navigator.clipboard.readText failed:', e);
    }
  }

  return '';
}

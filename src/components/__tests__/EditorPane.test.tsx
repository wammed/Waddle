import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorPane } from '../EditorPane';
import { AppConfig, TerminalContext } from '../../types';

vi.mock('../../services/tauriApi', () => ({
  TauriApi: {
    listDirectoryFiles: vi.fn().mockResolvedValue([]),
    editorOpenFile: vi.fn().mockResolvedValue({
      content: 'console.log("hello");',
      original_path: '/path/to/test.ts',
      canonical_path: '/path/to/test.ts',
      is_symlink: false,
      is_readonly: false,
      readonly_reason: null,
      warning_message: null,
      has_autosave: false,
      autosave_content: null,
      autosave_timestamp: null,
    }),
    editorSaveFile: vi.fn().mockResolvedValue({
      success: true,
      error_message: null,
      is_readonly_blocked: false,
      readonly_reason: null,
      backup_created: null,
    }),
  },
}));

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: {
      editor: {
        title: 'Script Editor',
        run: 'Run in Terminal',
        runTooltip: 'Run in Terminal',
        saveTooltip: 'Save (Ctrl+S)',
        closeTooltip: 'Close',
        pathPlaceholder: 'Enter file path...',
        selectPlaceholder: 'Select file...',
        textareaPlaceholder: 'Write or paste code here...',
        applyAiEdit: 'Apply',
        openFile: 'Open',
        newFile: 'New File',
        wordWrap: 'Word Wrap',
        readOnlyBadge: 'Read Only',
        lineCol: 'Line',
      },
      common: {
        cancel: 'Cancel',
      },
    },
    language: 'ja',
  }),
}));

const mockConfig: AppConfig = {
  general: {
    language: 'ja',
  },
  terminal: {
    font_family: 'monospace',
    font_size: 14,
    theme: 'dark',
    cursor_style: 'block',
    cursor_blink: true,
    opacity: 1.0,
    scrollback: 5000,
  },
  ai: {
    provider: 'ollama',
    ollama_endpoint: 'http://localhost:11434',
    ollama_model: 'codellama',
    temperature: 0.7,
  },
};

const mockContext: TerminalContext = {
  os: 'linux',
  shell: '/bin/bash',
  cwd: '/home/user',
};

describe('EditorPane', () => {
  it('renders editor container with textarea and actions when open', () => {
    const html = renderToStaticMarkup(
      <EditorPane
        isOpen={true}
        onClose={vi.fn()}
        cwd="/home/user"
        config={mockConfig}
        context={mockContext}
        onExecuteInTerminal={vi.fn()}
      />
    );

    expect(html).toContain('editor-container');
    expect(html).toContain('Script Editor');
  });

  it('renders empty when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <EditorPane
        isOpen={false}
        onClose={vi.fn()}
        cwd="/home/user"
        config={mockConfig}
        context={mockContext}
        onExecuteInTerminal={vi.fn()}
      />
    );

    expect(html).toBe('');
  });
});

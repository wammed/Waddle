import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsModal } from '../SettingsModal';
import { AppConfig } from '../../types';

vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: vi.fn(() => ({
    onDragDropEvent: vi.fn(),
  })),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}));

const mockConfigEn: AppConfig = {
  general: {
    language: 'en-US',
  },
  ai: {
    provider: 'ollama',
    ollama_endpoint: 'http://localhost:11434',
    ollama_model: 'llama3.2',
    temperature: 0.7,
  },
  terminal: {
    font_family: 'monospace',
    font_size: 14,
    theme: 'default',
    cursor_style: 'block',
    cursor_blink: true,
    opacity: 0.95,
    scrollback: 5000,
  },
  git: {
    enabled: true,
    restrict_to_github: true,
  },
  kitty_graphics: {
    enabled: true,
    max_dimension: 4096,
    max_payload_mb: 16,
    cache_limit_mb: 256,
    allowed_dir: '/home/user/Pictures',
  },
  editor: {
    autosave: true,
  },
};

const mockConfigJa: AppConfig = {
  ...mockConfigEn,
  general: {
    language: 'ja',
  },
};

describe('SettingsModal - About / Licenses Section', () => {
  it('renders the About / Licenses section in English when language is en-US', () => {
    const html = renderToStaticMarkup(
      <SettingsModal
        isOpen={true}
        onClose={() => {}}
        config={mockConfigEn}
        onSaveConfig={() => {}}
      />
    );

    // Section title and About card
    expect(html).toContain('settings-about-licenses-section');
    expect(html).toContain('About / Licenses');
    expect(html).toContain('AI-native Linux terminal environment');
    expect(html).toContain('v0.1.0 · MIT License');

    // Acknowledgements
    expect(html).toContain('Acknowledgements');
    expect(html).toContain('Waddle is built with and inspired by open-source projects');

    // Verify verified OSS projects are present
    expect(html).toContain('Tauri');
    expect(html).toContain('React');
    expect(html).toContain('Rust');
    expect(html).toContain('Vite');
    expect(html).toContain('xterm.js');
    expect(html).toContain('Prism.js');
    expect(html).toContain('Lucide Icons');

    // Verify libcosmic is NOT included as a dependency
    expect(html).not.toContain('libcosmic');

    // Licenses & Compliance
    expect(html).toContain('Licenses &amp; Third-Party Compliance');
    expect(html).toContain('View LICENSES.md');
    expect(html).toContain('View LICENSE (MIT)');
    expect(html).toContain('GitHub Repository');

    // Fonts policy (Nerd Fonts not bundled / user installed)
    expect(html).toContain('Waddle supports locally installed Nerd Fonts but does not bundle or redistribute Nerd Font files');
    expect(html).toContain('Users are responsible for obtaining and licensing fonts installed on their system');
  });

  it('renders the About / Licenses section in Japanese when language is ja', () => {
    const html = renderToStaticMarkup(
      <SettingsModal
        isOpen={true}
        onClose={() => {}}
        config={mockConfigJa}
        onSaveConfig={() => {}}
      />
    );

    // Section title and About card in Japanese
    expect(html).toContain('settings-about-licenses-section');
    expect(html).toContain('About / ライセンス');
    expect(html).toContain('AIネイティブなLinuxターミナル環境');
    expect(html).toContain('Waddle本体はMIT Licenseのもとで公開されているオープンソースソフトウェアです');

    // Acknowledgements in Japanese
    expect(html).toContain('Acknowledgements (謝辞)');
    expect(html).toContain('Waddleは、Tauri、React、Prism.js、xterm.js、Lucide Icons、Rust、Viteなどのオープンソースプロジェクトによって構築され、インスピレーションを受けています');

    // Licenses & Compliance in Japanese
    expect(html).toContain('ライセンスとサードパーティ適合性');
    expect(html).toContain('LICENSES.ja.md を開く');
    expect(html).toContain('LICENSE (MIT) を開く');
    expect(html).toContain('GitHubリポジトリ');

    // Fonts policy in Japanese (verbatim match)
    expect(html).toContain('WaddleはローカルにインストールされたNerd Fontsをサポートしていますが、Nerd Fontファイルをバンドルまたは再配布していません');
    expect(html).toContain('ユーザー自身がシステムにインストールするフォントの取得およびライセンスについて責任を負います');
  });

  it('renders the Waddle brand icon in both the modal top header and About hero card', () => {
    const html = renderToStaticMarkup(
      <SettingsModal
        isOpen={true}
        onClose={() => {}}
        config={mockConfigEn}
        onSaveConfig={() => {}}
      />
    );

    // Verify modal top header has the Waddle icon and updated title
    expect(html).toContain('class="ai-modal-header"');
    expect(html).toContain('alt="Waddle"');
    expect(html).toContain('Waddle Settings &amp; Licenses');

    // Count occurrences of alt="Waddle" (one in top header, one in About hero card)
    const iconMatches = html.match(/alt="Waddle"/g);
    expect(iconMatches).not.toBeNull();
    expect(iconMatches?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders Waddle 設定 &amp; ライセンス in modal top header when language is ja', () => {
    const html = renderToStaticMarkup(
      <SettingsModal
        isOpen={true}
        onClose={() => {}}
        config={mockConfigJa}
        onSaveConfig={() => {}}
      />
    );

    expect(html).toContain('Waddle 設定 &amp; ライセンス');
  });
});

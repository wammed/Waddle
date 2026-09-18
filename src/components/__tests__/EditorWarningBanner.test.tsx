import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorWarningBanner } from '../EditorWarningBanner';

describe('EditorWarningBanner', () => {
  it('renders nothing when message is empty', () => {
    const html = renderToStaticMarkup(<EditorWarningBanner message="" />);
    expect(html).toBe('');
  });

  it('renders caution banner with warning message and alert role', () => {
    const msg = '⚠️ シェル設定ファイルです。構文ミスによりシェル起動に影響が出る恐れがあります（自動バックアップ有効）。';
    const html = renderToStaticMarkup(<EditorWarningBanner message={msg} />);

    expect(html).toContain('data-testid="editor-warning-banner"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(msg);
  });

  it('applies amber/yellow caution style', () => {
    const html = renderToStaticMarkup(<EditorWarningBanner message="Caution" />);
    // Check styled background or border matching amber caution design
    expect(html).toContain('rgba(245, 158, 11');
  });
});

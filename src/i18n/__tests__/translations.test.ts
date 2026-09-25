import { describe, it, expect } from 'vitest';
import { translations } from '../translations';
import { Language } from '../../types';

describe('translations', () => {
  const languages: Language[] = ['en-US', 'en-GB', 'ja'];

  it('defines translations for all supported languages', () => {
    for (const lang of languages) {
      expect(translations[lang]).toBeDefined();
    }
  });

  it('has matching top-level keys across all languages', () => {
    const enKeys = Object.keys(translations['en-US']).sort();
    for (const lang of languages) {
      const keys = Object.keys(translations[lang]).sort();
      expect(keys).toEqual(enKeys);
    }
  });

  it('has matching sub-keys in copilot category across all languages', () => {
    const enCopilotKeys = Object.keys(translations['en-US'].copilot).sort();
    for (const lang of languages) {
      const keys = Object.keys(translations[lang].copilot).sort();
      expect(keys).toEqual(enCopilotKeys);
    }
  });

  it('has matching sub-keys in editor category across all languages', () => {
    const enEditorKeys = Object.keys(translations['en-US'].editor).sort();
    for (const lang of languages) {
      const keys = Object.keys(translations[lang].editor).sort();
      expect(keys).toEqual(enEditorKeys);
    }
  });

  it('has matching sub-keys in settings category across all languages', () => {
    const enSettingsKeys = Object.keys(translations['en-US'].settings).sort();
    for (const lang of languages) {
      const keys = Object.keys(translations[lang].settings).sort();
      expect(keys).toEqual(enSettingsKeys);
    }
  });

  it('contains consistent About and Licenses information across all supported languages', () => {
    const requiredAboutKeys = [
      'aboutSectionTitle',
      'aboutAppName',
      'aboutTagline',
      'aboutDescription',
      'aboutWaddleLicense',
      'acknowledgementsTitle',
      'acknowledgementsIntro',
      'projectTauriDesc',
      'projectReactDesc',
      'projectRustDesc',
      'projectViteDesc',
      'projectXtermDesc',
      'projectPrismDesc',
      'projectLucideDesc',
      'licensesSectionTitle',
      'licensesWaddleDesc',
      'licensesThirdPartyDesc',
      'licensesAuthoritativeDesc',
      'fontsPolicyTitle',
      'fontsPolicyDesc',
      'assetsPolicyDesc',
      'viewLicensesDocBtn',
      'viewLicenseFileBtn',
      'viewRepoBtn',
    ] as const;

    for (const lang of languages) {
      for (const key of requiredAboutKeys) {
        const val = translations[lang].settings[key];
        expect(typeof val).toBe('string');
        expect(val.length).toBeGreaterThan(0);
      }
    }

    // Verify key policy details in English
    const en = translations['en-US'].settings;
    expect(en.fontsPolicyDesc).toContain('does not bundle or redistribute Nerd Font files');
    expect(en.fontsPolicyDesc).toContain('Users are responsible for obtaining and licensing fonts installed on their system');
    expect(en.licensesAuthoritativeDesc).toContain('LICENSES.md');
    expect(en.acknowledgementsIntro).toContain('Tauri, React, Prism.js, xterm.js, Lucide Icons, Rust, and Vite');

    // Verify key policy details in Japanese
    const ja = translations['ja'].settings;
    expect(ja.fontsPolicyDesc).toContain('Nerd Fontファイルをバンドルまたは再配布していません');
    expect(ja.fontsPolicyDesc).toContain('ユーザー自身がシステムにインストールするフォントの取得およびライセンスについて責任を負います');
    expect(ja.licensesAuthoritativeDesc).toContain('LICENSES.ja.md');
    expect(ja.acknowledgementsIntro).toContain('Tauri、React、Prism.js、xterm.js、Lucide Icons、Rust、Vite');
  });
});

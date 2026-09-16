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
});

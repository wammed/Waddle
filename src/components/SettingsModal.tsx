import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  X,
  Terminal as TermIcon,
  Save,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Type,
  Image as ImageIcon,
  FolderOpen,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { AppConfig, Language, OllamaStatus } from '../types';
import { THEMES } from '../theme';
import { TauriApi } from '../services/tauriApi';
import { useI18n, translations } from '../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
}

const inputStyle: React.CSSProperties = {
  backgroundColor: '#181e2e',
  color: '#f8fafc',
  border: '1px solid rgba(56, 189, 248, 0.25)',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  colorScheme: 'dark',
};

const getFontOptions = (lang: string) => [
  {
    label: lang === 'ja' ? 'JetBrainsMono Nerd Font (推奨)' : 'JetBrainsMono Nerd Font (Recommended)',
    value: "'JetBrainsMono Nerd Font', 'JetBrains Mono', 'Symbols Nerd Font Mono', monospace",
  },
  {
    label: 'MesloLGS NF (Powerlevel10k / Oh My Posh)',
    value: "'MesloLGS NF', 'MesloLGS Nerd Font', 'Symbols Nerd Font Mono', monospace",
  },
  {
    label: lang === 'ja' ? 'FiraCode Nerd Font (リガチャ対応)' : 'FiraCode Nerd Font (Ligatures)',
    value: "'FiraCode Nerd Font', 'Fira Code', 'Symbols Nerd Font Mono', monospace",
  },
  {
    label: 'Hack Nerd Font',
    value: "'Hack Nerd Font', 'Hack', 'Symbols Nerd Font Mono', monospace",
  },
  {
    label: 'CaskaydiaCove Nerd Font (Cascadia Code)',
    value: "'CaskaydiaCove Nerd Font', 'Cascadia Code', 'Symbols Nerd Font Mono', monospace",
  },
  {
    label: 'SauceCodePro Nerd Font (Source Code Pro)',
    value: "'SauceCodePro Nerd Font', 'Source Code Pro', 'Symbols Nerd Font Mono', monospace",
  },
  {
    label: lang === 'ja' ? 'Symbols Nerd Font Only (記号フォールバック)' : 'Symbols Nerd Font Only (Symbol Fallback)',
    value: "'Symbols Nerd Font Mono', 'JetBrains Mono', monospace",
  },
  {
    label: lang === 'ja' ? 'システム等幅 (monospace)' : 'System Monospace (monospace)',
    value: 'monospace',
  },
  {
    label: lang === 'ja' ? 'カスタムフォント...' : 'Custom Font...',
    value: 'custom',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const { t: globalT } = useI18n();
  const [formData, setFormData] = useState<AppConfig>({ ...config });
  const selectedLang = formData.general?.language || 'en-US';
  const t = translations[selectedLang] || globalT;
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isCustomFont, setIsCustomFont] = useState(false);

  // Wallpaper modes: 'none' | 'preset_cyberpunk' | 'custom'
  const [bgMode, setBgMode] = useState<'none' | 'preset_cyberpunk' | 'custom'>('none');
  const [customBgPath, setCustomBgPath] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOllamaStatus = async (endpoint?: string) => {
    setIsCheckingOllama(true);
    try {
      const status = await TauriApi.checkOllamaStatus(endpoint || formData.ai.ollama_endpoint);
      setOllamaStatus(status);
      if (status.models.length > 0 && (!formData.ai.ollama_model || !status.models.includes(formData.ai.ollama_model))) {
        setFormData((prev) => ({
          ...prev,
          ai: { ...prev.ai, ollama_model: status.models[0] },
        }));
      }
    } catch (err) {
      console.warn('Ollama status check error:', err);
    } finally {
      setIsCheckingOllama(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...config });
      fetchOllamaStatus(config.ai.ollama_endpoint);
      const isKnownPreset = getFontOptions(selectedLang).some((f) => f.value === config.terminal.font_family);
      setIsCustomFont(!isKnownPreset && config.terminal.font_family !== 'custom');

      // Initialize background image state
      const bg = config.terminal.background_image;
      if (!bg || bg === 'none') {
        setBgMode('none');
        setCustomBgPath('');
      } else if (bg === 'preset_cyberpunk' || bg === 'preset_official') {
        setBgMode('preset_cyberpunk');
        setCustomBgPath('');
      } else {
        setBgMode('custom');
        setCustomBgPath(bg);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBgModeChange = (mode: 'none' | 'preset_cyberpunk' | 'custom') => {
    setBgMode(mode);
    if (mode === 'none') {
      setFormData((prev) => ({
        ...prev,
        terminal: { ...prev.terminal, background_image: undefined },
      }));
    } else if (mode === 'preset_cyberpunk') {
      setFormData((prev) => ({
        ...prev,
        terminal: { ...prev.terminal, background_image: 'preset_cyberpunk' },
      }));
    } else {
      if (!customBgPath) {
        handleBrowseClick();
      } else {
        setFormData((prev) => ({
          ...prev,
          terminal: { ...prev.terminal, background_image: customBgPath },
        }));
      }
    }
  };

  const handleCustomPathChange = (val: string) => {
    setCustomBgPath(val);
    setFormData((prev) => ({
      ...prev,
      terminal: { ...prev.terminal, background_image: val.trim() ? val : undefined },
    }));
  };

  // Browse for wallpaper image using native file dialog with file-input fallback
  const handleBrowseClick = async () => {
    try {
      const selectedPath = await TauriApi.pickWallpaperFile();
      if (selectedPath) {
        setCustomBgPath(selectedPath);
        setFormData((prev) => ({
          ...prev,
          terminal: { ...prev.terminal, background_image: selectedPath },
        }));
        return;
      }
    } catch (err) {
      console.warn('Native picker error, trying input fallback:', err);
    }
    fileInputRef.current?.click();
  };

  // Local File Selector fallback using Tauri backend to save directly to disk
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const savedPath = await TauriApi.saveWallpaperFile(file.name, bytes);
      setCustomBgPath(savedPath);
      setFormData((prev) => ({
        ...prev,
        terminal: { ...prev.terminal, background_image: savedPath },
      }));
    } catch (err) {
      console.error('Failed to save wallpaper file:', err);
    }
  };

  const handleSave = async () => {
    await TauriApi.saveConfig(formData);
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="ai-modal"
        style={{ width: '660px', backgroundColor: '#131722', color: '#f8fafc' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="ai-modal-title" style={{ color: 'var(--fg-main)' }}>
            <Settings size={16} />
            <span>{t.settings.modalTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="action-btn"
            style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="settings-content">
          {/* Language Selection Section */}
          <div className="settings-section">
            <div className="section-title">
              <Globe size={14} style={{ display: 'inline', marginRight: 6 }} />
              {t.settings.languageSectionTitle}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8' }}>
                {t.settings.languageLabel}
              </label>
              <select
                className="form-select"
                style={inputStyle}
                value={selectedLang}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    general: {
                      ...formData.general,
                      language: e.target.value as Language,
                    },
                  })
                }
              >
                <option value="en-US" style={{ background: '#181e2e', color: '#f8fafc' }}>
                  {t.settings.languages.enUS}
                </option>
                <option value="en-GB" style={{ background: '#181e2e', color: '#f8fafc' }}>
                  {t.settings.languages.enGB}
                </option>
                <option value="ja" style={{ background: '#181e2e', color: '#f8fafc' }}>
                  {t.settings.languages.ja}
                </option>
              </select>
            </div>
          </div>

          {/* Ollama Local AI Section */}
          <div className="settings-section">
            <div className="section-title">
              <HardDrive size={14} style={{ display: 'inline', marginRight: 6 }} />
              {t.settings.aiSectionTitle}
            </div>

            {/* Status Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: ollamaStatus?.available ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                border: `1px solid ${ollamaStatus?.available ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {ollamaStatus?.available ? (
                  <CheckCircle2 size={16} color="#10b981" />
                ) : (
                  <AlertCircle size={16} color="#f43f5e" />
                )}
                <div>
                  {ollamaStatus?.available ? (
                    <span style={{ color: '#34d399', fontWeight: 600 }}>
                      {t.settings.ollamaConnected(ollamaStatus.version || '0.x', ollamaStatus.models.length)}
                    </span>
                  ) : (
                    <span style={{ color: '#fda4af', fontWeight: 600 }}>
                      {t.settings.ollamaDisconnected}
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px', background: '#1b2234', color: '#f8fafc' }}
                onClick={() => fetchOllamaStatus(formData.ai.ollama_endpoint)}
                disabled={isCheckingOllama}
              >
                <RefreshCw size={12} className={isCheckingOllama ? 'animate-spin' : ''} />
                <span>{t.settings.ollamaRefetch}</span>
              </button>
            </div>

            {!ollamaStatus?.available && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  padding: '8px 12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '6px',
                  lineHeight: 1.6,
                }}
              >
                {t.settings.ollamaHint}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8' }}>{t.settings.ollamaEndpointLabel}</label>
              <input
                type="text"
                className="form-input"
                style={inputStyle}
                placeholder="http://localhost:11434"
                value={formData.ai.ollama_endpoint}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ai: { ...formData.ai, ollama_endpoint: e.target.value },
                  })
                }
              />
            </div>

            {/* Remote Ollama Endpoint Security Warning */}
            {(() => {
              const ep = formData.ai.ollama_endpoint?.trim().toLowerCase() || '';
              const isRemote =
                ep !== '' &&
                !ep.includes('localhost') &&
                !ep.includes('127.0.0.1') &&
                !ep.includes('0.0.0.0') &&
                !ep.includes('::1');
              if (!isRemote) return null;
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 12px',
                    marginTop: '-4px',
                    marginBottom: '12px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#fbbf24',
                    lineHeight: 1.5,
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{t.settings.ollamaRemoteWarning}</span>
                </div>
              );
            })()}

            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8' }}>{t.settings.ollamaModelLabel}</label>
              {ollamaStatus?.available && ollamaStatus.models.length > 0 ? (
                <select
                  className="form-select"
                  style={inputStyle}
                  value={formData.ai.ollama_model}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ai: { ...formData.ai, ollama_model: e.target.value },
                    })
                  }
                >
                  {ollamaStatus.models.map((model) => (
                    <option key={model} value={model} style={{ background: '#181e2e', color: '#f8fafc' }}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  style={inputStyle}
                  placeholder="llama3.2 / deepseek-r1 / qwen2.5-coder"
                  value={formData.ai.ollama_model}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ai: { ...formData.ai, ollama_model: e.target.value },
                    })
                  }
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8' }}>{t.settings.temperatureLabel(formData.ai.temperature)}</label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={formData.ai.temperature}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ai: { ...formData.ai, temperature: parseFloat(e.target.value) },
                  })
                }
              />
            </div>
          </div>

          {/* Terminal Appearance Section */}
          <div className="settings-section">
            <div className="section-title">
              <TermIcon size={14} style={{ display: 'inline', marginRight: 6 }} />
              {t.settings.terminalSectionTitle}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8' }}>{t.settings.themeLabel}</label>
              <select
                className="form-select"
                style={inputStyle}
                value={formData.terminal.theme}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    terminal: { ...formData.terminal, theme: e.target.value },
                  })
                }
              >
                {Object.values(THEMES).map((th) => (
                  <option key={th.id} value={th.id} style={{ background: '#181e2e', color: '#f8fafc' }}>
                    {th.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Selection */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Type size={13} />
                <span>{t.settings.fontLabel}</span>
              </label>

              <select
                className="form-select"
                style={inputStyle}
                value={isCustomFont ? 'custom' : formData.terminal.font_family}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomFont(true);
                  } else {
                    setIsCustomFont(false);
                    setFormData({
                      ...formData,
                      terminal: { ...formData.terminal, font_family: e.target.value },
                    });
                  }
                }}
              >
                {getFontOptions(selectedLang).map((f) => (
                  <option key={f.value} value={f.value} style={{ background: '#181e2e', color: '#f8fafc' }}>
                    {f.label}
                  </option>
                ))}
              </select>

              {isCustomFont && (
                <input
                  type="text"
                  className="form-input"
                  style={{ ...inputStyle, marginTop: '6px' }}
                  placeholder={t.settings.customFontPlaceholder}
                  value={formData.terminal.font_family}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      terminal: { ...formData.terminal, font_family: e.target.value },
                    })
                  }
                />
              )}

              {/* Font Preview */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontFamily: formData.terminal.font_family,
                  fontSize: `${formData.terminal.font_size}px`,
                  color: 'var(--accent)',
                  marginTop: '4px',
                  overflowX: 'auto',
                }}
              >
                <div> /home/user/project  main*    ⚡</div>
                <div style={{ color: 'var(--fg-muted)', fontSize: '11px', marginTop: '2px' }}>
                  const code = (x: number) =&gt; x &gt;= 42 != null;
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#94a3b8' }}>{t.settings.fontSizeLabel}</label>
                <input
                  type="number"
                  className="form-input"
                  style={inputStyle}
                  min={10}
                  max={32}
                  value={formData.terminal.font_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      terminal: {
                        ...formData.terminal,
                        font_size: parseInt(e.target.value) || 14,
                      },
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#94a3b8' }}>{t.settings.cursorStyleLabel}</label>
                <select
                  className="form-select"
                  style={inputStyle}
                  value={formData.terminal.cursor_style}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      terminal: {
                        ...formData.terminal,
                        cursor_style: e.target.value as any,
                      },
                    })
                  }
                >
                  <option value="block" style={{ background: '#181e2e', color: '#f8fafc' }}>{t.settings.cursorBlock}</option>
                  <option value="underline" style={{ background: '#181e2e', color: '#f8fafc' }}>{t.settings.cursorUnderline}</option>
                  <option value="bar" style={{ background: '#181e2e', color: '#f8fafc' }}>{t.settings.cursorBar}</option>
                </select>
              </div>
            </div>

            {/* Wallpaper & Background Image Section */}
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label className="form-label" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ImageIcon size={13} />
                <span>{t.settings.wallpaperLabel}</span>
              </label>

              <select
                className="form-select"
                style={inputStyle}
                value={bgMode}
                onChange={(e) => handleBgModeChange(e.target.value as any)}
              >
                <option value="none" style={{ background: '#181e2e', color: '#f8fafc' }}>{t.settings.wallpaperNone}</option>
                <option value="preset_cyberpunk" style={{ background: '#181e2e', color: '#f8fafc' }}>{t.settings.wallpaperOfficial}</option>
                <option value="custom" style={{ background: '#181e2e', color: '#f8fafc' }}>{t.settings.wallpaperCustom}</option>
              </select>

              {bgMode === 'custom' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder={t.settings.wallpaperCustomPlaceholder}
                    value={customBgPath}
                    onChange={(e) => handleCustomPathChange(e.target.value)}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ background: '#1b2234', color: '#f8fafc', whiteSpace: 'nowrap' }}
                    onClick={handleBrowseClick}
                    title={t.common.browse}
                  >
                    <FolderOpen size={14} />
                    <span>{t.common.browse}</span>
                  </button>
                </div>
              )}

              {bgMode !== 'none' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#94a3b8' }}>
                      {t.settings.wallpaperOpacityLabel(Math.round((formData.terminal.background_opacity ?? 0.85) * 100))}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={formData.terminal.background_opacity ?? 0.85}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          terminal: {
                            ...formData.terminal,
                            background_opacity: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: '#94a3b8' }}>
                      {t.settings.wallpaperBlurLabel(formData.terminal.background_blur ?? 0)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={formData.terminal.background_blur ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          terminal: {
                            ...formData.terminal,
                            background_blur: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button className="btn-secondary" style={{ background: '#1b2234', color: '#f8fafc' }} onClick={onClose}>
            {t.settings.cancelBtn}
          </button>
          <button id="btn-save-settings" className="btn-primary" onClick={handleSave}>
            {savedSuccess ? <Check size={14} /> : <Save size={14} />}
            <span>{savedSuccess ? t.settings.savedBtn : t.settings.saveBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

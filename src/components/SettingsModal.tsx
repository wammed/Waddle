import React, { useState, useEffect, useRef } from 'react';
import {
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
  GitBranch,
  ShieldCheck,
  Zap,
  ClipboardCheck,
  FileCode,
  Info,
  ExternalLink,
  Heart,
  Scale,
} from 'lucide-react';
import { AppConfig, Language, OllamaStatus } from '../types';
import { THEMES } from '../theme';
import { TauriApi } from '../services/tauriApi';
import { useI18n, translations } from '../i18n';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { openUrl } from '@tauri-apps/plugin-opener';
import waddleIcon from '../assets/waddle-icon.svg';

const ACKNOWLEDGED_PROJECTS = [
  {
    name: 'Tauri',
    descKey: 'projectTauriDesc' as const,
    url: 'https://tauri.app/',
    license: 'Apache-2.0 / MIT',
  },
  {
    name: 'React',
    descKey: 'projectReactDesc' as const,
    url: 'https://react.dev/',
    license: 'MIT',
  },
  {
    name: 'Rust',
    descKey: 'projectRustDesc' as const,
    url: 'https://www.rust-lang.org/',
    license: 'MIT / Apache-2.0',
  },
  {
    name: 'Vite',
    descKey: 'projectViteDesc' as const,
    url: 'https://vite.dev/',
    license: 'MIT',
  },
  {
    name: 'xterm.js',
    descKey: 'projectXtermDesc' as const,
    url: 'https://xtermjs.org/',
    license: 'MIT',
  },
  {
    name: 'Prism.js',
    descKey: 'projectPrismDesc' as const,
    url: 'https://prismjs.com/',
    license: 'MIT',
  },
  {
    name: 'Lucide Icons',
    descKey: 'projectLucideDesc' as const,
    url: 'https://lucide.dev/',
    license: 'MIT',
  },
] as const;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onOpenTestPlan?: () => void;
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
  onOpenTestPlan,
}) => {
  const { t: globalT } = useI18n();
  const [formData, setFormData] = useState<AppConfig>({ ...config });
  const selectedLang = formData.general?.language || 'en-US';
  const t = translations[selectedLang] || globalT;
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [bgMode, setBgMode] = useState<'none' | 'preset_cyberpunk' | 'custom'>('none');
  const [customBgPath, setCustomBgPath] = useState<string>('');
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isCustomFont, setIsCustomFont] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const fetchOllamaStatus = async (endpoint?: string) => {
    setIsCheckingOllama(true);
    try {
      const status = await TauriApi.checkOllamaStatus(endpoint || formData.ai.ollama_endpoint);
      setOllamaStatus(status);
      if (status.models.length > 0) {
        setFormData((prev) => {
          if (!prev.ai.ollama_model || !status.models.includes(prev.ai.ollama_model)) {
            return {
              ...prev,
              ai: { ...prev.ai, ollama_model: status.models[0] },
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Ollama status check error:', err);
    } finally {
      setIsCheckingOllama(false);
    }
  };

  // Only initialize form data when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setFormData({ ...config });
      setWallpaperError(null);
      setIsDraggingOver(false);
      fetchOllamaStatus(config.ai.ollama_endpoint);
      const initialLang = config.general?.language || 'en-US';
      const isKnownPreset = getFontOptions(initialLang).some((f) => f.value === config.terminal.font_family);
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
    prevIsOpenRef.current = isOpen;
  }, [isOpen, config]);

  // Keydown Escape handler decoupled from form data lifecycle
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Tauri native Window Drag and Drop listener for Linux WebKitGTK
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    let unlistenFn: (() => void) | null = null;

    try {
      getCurrentWebview().onDragDropEvent(async (event) => {
        if (!isMounted) return;
        const payload = event.payload;
        if (payload.type === 'enter' || payload.type === 'over') {
          setIsDraggingOver(true);
        } else if (payload.type === 'leave') {
          setIsDraggingOver(false);
        } else if (payload.type === 'drop') {
          setIsDraggingOver(false);
          const paths = payload.paths;
          if (paths && paths.length > 0) {
            const rawPath = paths[0];
            try {
              await TauriApi.validateWallpaperPath(rawPath);
              setWallpaperError(null);
              setBgMode('custom');
              setCustomBgPath(rawPath);
              setFormData((prev) => ({
                ...prev,
                terminal: { ...prev.terminal, background_image: rawPath },
              }));
              document.documentElement.style.setProperty(
                '--live-wallpaper-opacity',
                String(formData.terminal.background_opacity ?? 0.85)
              );
            } catch (err: any) {
              console.warn('Dropped wallpaper validation failed:', err);
              const errMsg = typeof err === 'string' ? err : err?.message || String(err);
              setWallpaperError(errMsg);
            }
          }
        }
      }).then((unlisten) => {
        if (isMounted) {
          unlistenFn = unlisten;
        } else {
          unlisten();
        }
      }).catch((e) => {
        console.warn('onDragDropEvent listener failed:', e);
      });
    } catch (e) {
      console.warn('getCurrentWebview not available:', e);
    }

    return () => {
      isMounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [isOpen, formData.terminal.background_opacity]);

  if (!isOpen) return null;

  const handleBgModeChange = (mode: 'none' | 'preset_cyberpunk' | 'custom') => {
    setBgMode(mode);
    setWallpaperError(null);
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
      if (customBgPath) {
        setFormData((prev) => ({
          ...prev,
          terminal: { ...prev.terminal, background_image: customBgPath },
        }));
      }
    }
  };

  const handleCustomPathChange = (val: string) => {
    setCustomBgPath(val);
    setWallpaperError(null);
    setFormData((prev) => ({
      ...prev,
      terminal: { ...prev.terminal, background_image: val.trim() ? val : undefined },
    }));
  };

  // Browse for wallpaper image using native file dialog with file-input fallback
  const handleBrowseClick = async () => {
    setWallpaperError(null);
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
    } catch (err: any) {
      console.warn('Native picker error:', err);
      const errMsg = typeof err === 'string' ? err : err?.message || String(err);
      if (errMsg.includes('許可されていない') || errMsg.includes('マジックバイト') || errMsg.includes('存在しません')) {
        setWallpaperError(errMsg);
        return;
      }
    }
    fileInputRef.current?.click();
  };

  // Local File Selector fallback using Tauri backend to save directly to disk
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWallpaperError(null);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const savedPath = await TauriApi.saveWallpaperFile(file.name, bytes);
      setCustomBgPath(savedPath);
      setFormData((prev) => ({
        ...prev,
        terminal: { ...prev.terminal, background_image: savedPath },
      }));
    } catch (err: any) {
      console.error('Failed to save wallpaper file:', err);
      const errMsg = typeof err === 'string' ? err : err?.message || String(err);
      setWallpaperError(errMsg);
    }
  };

  // Drag and drop handler for wallpaper images
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    setWallpaperError(null);

    // 1. Try extracting local file path from text/uri-list or text/plain (standard Linux desktop file managers)
    const uriList = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    let localPath = '';
    if (uriList) {
      const firstLine = uriList.split('\n')[0].trim();
      if (firstLine.startsWith('file://')) {
        localPath = decodeURIComponent(firstLine.replace(/^file:\/\//, ''));
      } else if (firstLine.startsWith('/')) {
        localPath = firstLine;
      }
    }

    const file = e.dataTransfer.files?.[0];
    if (!localPath && (file as any)?.path) {
      localPath = (file as any).path;
    }

    if (localPath) {
      try {
        await TauriApi.validateWallpaperPath(localPath);
        setCustomBgPath(localPath);
        setFormData((prev) => ({
          ...prev,
          terminal: { ...prev.terminal, background_image: localPath },
        }));
        return;
      } catch (err: any) {
        console.warn('Direct path drop validation failed, attempting byte read:', err);
      }
    }

    if (file) {
      try {
        const buffer = await file.arrayBuffer();
        if (buffer && buffer.byteLength > 0) {
          const bytes = new Uint8Array(buffer);
          const savedPath = await TauriApi.saveWallpaperFile(file.name, bytes);
          setCustomBgPath(savedPath);
          setFormData((prev) => ({
            ...prev,
            terminal: { ...prev.terminal, background_image: savedPath },
          }));
          return;
        }
      } catch (err: any) {
        console.error('Failed to save dropped wallpaper:', err);
        const errMsg = typeof err === 'string' ? err : err?.message || String(err);
        setWallpaperError(errMsg);
      }
    }
  };

  const handleOpenExternalUrl = (url: string) => {
    openUrl(url).catch((err) => {
      console.warn('Failed to open external url:', err);
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  };

  const handleSave = async () => {
    setWallpaperError(null);
    try {
      if (formData.terminal.background_image && bgMode === 'custom') {
        await TauriApi.validateWallpaperPath(formData.terminal.background_image);
      }
      const sanitizedConfig: AppConfig = {
        ...formData,
        general: {
          ...formData.general,
          language: formData.general?.language || 'en-US',
        },
        terminal: {
          ...formData.terminal,
          font_size: Math.max(10, Math.min(32, formData.terminal.font_size || 14)),
        },
        kitty_graphics: formData.kitty_graphics
          ? {
              ...formData.kitty_graphics,
              max_dimension: Math.max(1024, Math.min(8192, formData.kitty_graphics.max_dimension || 4096)),
              max_payload_mb: Math.max(4, Math.min(64, formData.kitty_graphics.max_payload_mb || 16)),
              cache_limit_mb: Math.max(64, Math.min(1024, formData.kitty_graphics.cache_limit_mb || 256)),
            }
          : undefined,
        editor: {
          autosave: formData.editor?.autosave ?? true,
        },
      };
      await TauriApi.saveConfig(sanitizedConfig);
      onSaveConfig(sanitizedConfig);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onCloseRef.current();
      }, 700);
    } catch (err: any) {
      console.error('Failed to save config:', err);
      const errMsg = typeof err === 'string' ? err : err?.message || String(err);
      setWallpaperError(errMsg);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="ai-modal"
        style={{ width: '700px', maxWidth: '92vw', backgroundColor: '#131722', color: '#f8fafc' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="ai-modal-header"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
          }}
        >
          <div
            className="ai-modal-title"
            style={{
              color: 'var(--fg-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(56, 189, 248, 0.05))',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src={waddleIcon}
                alt="Waddle"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '6px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 0 8px var(--accent-glow))',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                color: '#f8fafc',
              }}
            >
              {t.settings.modalTitle}
            </span>
          </div>
          <button
            onClick={onClose}
            className="action-btn"
            style={{ padding: '6px 8px', border: 'none', background: 'transparent' }}
            title={t.common.close}
            aria-label={t.common.close}
          >
            <X size={22} />
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
                onChange={(e) => {
                  const newLang = e.target.value as Language;
                  setFormData((prev) => ({
                    ...prev,
                    general: {
                      ...prev.general,
                      language: newLang,
                    },
                  }));
                }}
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
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                ) : (
                  <AlertCircle size={16} style={{ color: '#f43f5e' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {ollamaStatus?.available
                      ? t.settings.ollamaConnected(ollamaStatus.version || '0.x', ollamaStatus.models.length)
                      : t.settings.ollamaDisconnected}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchOllamaStatus()}
                disabled={isCheckingOllama}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px' }}
              >
                <RefreshCw size={12} className={isCheckingOllama ? 'animate-spin' : ''} />
                <span>{t.settings.ollamaRefetch}</span>
              </button>
            </div>

            {!ollamaStatus?.available && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  border: '1px dashed rgba(244, 63, 94, 0.3)',
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
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    ai: { ...prev.ai, ollama_endpoint: val },
                  }));
                }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      ai: { ...prev.ai, ollama_model: val },
                    }));
                  }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      ai: { ...prev.ai, ollama_model: val },
                    }));
                  }}
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
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    ai: { ...prev.ai, temperature: isNaN(val) ? 0.2 : val },
                  }));
                }}
              />
            </div>

            {/* Project Specific Rules Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              marginTop: '12px',
            }}>
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  {selectedLang === 'ja' ? 'プロジェクト個別 & グローバル共通 AI ルール' : 'Project & Global Common AI Rules'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {selectedLang === 'ja'
                    ? 'リポジトリ内では上位ルートの .waddle/rules_ja.md (日本語) / rules.md (英語) を最優先し、プロジェクト外では ~/.config/waddle/ のグローバル共通ルールを自動検知してAIへ注入します'
                    : 'Prioritizes project .waddle/rules.md (US/UK) / rules_ja.md (JA) in repos, and falls back to global common rules in ~/.config/waddle/ outside projects'}
                </div>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={formData.ai.enable_project_rules ?? true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      ai: { ...prev.ai, enable_project_rules: checked },
                    }));
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: (formData.ai.enable_project_rules ?? true) ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  transition: '0.2s',
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '18px',
                    width: '18px',
                    left: (formData.ai.enable_project_rules ?? true) ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Terminal Appearance Section */}
          <div className="settings-section">
            <div className="section-title">
              <TermIcon size={14} style={{ display: 'inline', marginRight: 6 }} />
              {t.settings.terminalSectionTitle}
            </div>

            {/* Color Theme Selection */}
            {(() => {
              const neonThemes = Object.values(THEMES).filter((th) => th.category === 'neon');
              const classicThemes = Object.values(THEMES).filter((th) => th.category !== 'neon');
              const currentTheme = THEMES[formData.terminal.theme] || THEMES.waddle_dark;
              const isNeon = currentTheme.category === 'neon';

              return (
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ color: '#94a3b8', margin: 0 }}>{t.settings.themeLabel}</label>
                    {isNeon && (
                      <span className="theme-neon-badge">
                        <Zap size={10} />
                        {t.settings.neonBadge}
                      </span>
                    )}
                  </div>
                  <select
                    className="form-select"
                    style={inputStyle}
                    value={formData.terminal.theme}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        terminal: { ...prev.terminal, theme: val },
                      }));
                    }}
                  >
                    <optgroup label={t.settings.neonThemesGroup}>
                      {neonThemes.map((th) => (
                        <option key={th.id} value={th.id} style={{ background: '#181e2e', color: '#f8fafc' }}>
                          {th.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t.settings.classicThemesGroup}>
                      {classicThemes.map((th) => (
                        <option key={th.id} value={th.id} style={{ background: '#181e2e', color: '#f8fafc' }}>
                          {th.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {/* Live Theme Preview Box */}
                  <div className={`theme-preview-card ${isNeon ? 'is-neon' : ''}`}>
                    {currentTheme.description && (
                      <div className="theme-preview-desc">
                        {currentTheme.description}
                      </div>
                    )}
                    <div className="theme-preview-swatches">
                      <div className="theme-swatch" title={`UI Accent: ${currentTheme.ui.accent}`}>
                        <span
                          className="theme-swatch-dot glowing"
                          style={{
                            backgroundColor: currentTheme.ui.accent,
                            color: currentTheme.ui.accent,
                          }}
                        />
                        <span>Accent</span>
                      </div>
                      <div className="theme-swatch" title={`Cursor: ${currentTheme.terminal.cursor || currentTheme.ui.accent}`}>
                        <span
                          className="theme-swatch-dot"
                          style={{ backgroundColor: (currentTheme.terminal.cursor as string) || currentTheme.ui.accent }}
                        />
                        <span>Cursor</span>
                      </div>
                      <div className="theme-ansi-strip" title="ANSI Color Palette">
                        {[
                          currentTheme.terminal.red,
                          currentTheme.terminal.green,
                          currentTheme.terminal.yellow,
                          currentTheme.terminal.blue,
                          currentTheme.terminal.magenta,
                          currentTheme.terminal.cyan,
                        ].map((c, i) => (
                          <span
                            key={i}
                            className="theme-ansi-dot"
                            style={{ backgroundColor: c as string }}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Live mini terminal prompt preview */}
                    <div
                      className="theme-mini-terminal"
                      style={{
                        backgroundColor: (currentTheme.terminal.background as string) || '#0a0a0a',
                        color: (currentTheme.terminal.foreground as string) || '#ffffff',
                      }}
                    >
                      <span style={{ color: currentTheme.ui.accent }}>~/waddle</span>
                      <span style={{ color: (currentTheme.terminal.green as string) || currentTheme.ui.accent }}>❯</span>
                      <span>git status</span>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '7px',
                          height: '13px',
                          backgroundColor: (currentTheme.terminal.cursor as string) || currentTheme.ui.accent,
                          boxShadow: `0 0 6px ${currentTheme.ui.accent}`,
                          marginLeft: '2px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

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
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomFont(true);
                  } else {
                    setIsCustomFont(false);
                    setFormData((prev) => ({
                      ...prev,
                      terminal: { ...prev.terminal, font_family: val },
                    }));
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      terminal: { ...prev.terminal, font_family: val },
                    }));
                  }}
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
                  value={formData.terminal.font_size || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setFormData((prev) => ({
                      ...prev,
                      terminal: {
                        ...prev.terminal,
                        font_size: isNaN(val) ? 0 : val,
                      },
                    }));
                  }}
                  onBlur={() => {
                    setFormData((prev) => ({
                      ...prev,
                      terminal: {
                        ...prev.terminal,
                        font_size: Math.max(10, Math.min(32, prev.terminal.font_size || 14)),
                      },
                    }));
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#94a3b8' }}>{t.settings.cursorStyleLabel}</label>
                <select
                  className="form-select"
                  style={inputStyle}
                  value={formData.terminal.cursor_style}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setFormData((prev) => ({
                      ...prev,
                      terminal: {
                        ...prev.terminal,
                        cursor_style: val,
                      },
                    }));
                  }}
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

              {/* Prominent Wallpaper Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '14px 12px',
                  borderRadius: '8px',
                  border: isDraggingOver
                    ? '2px dashed var(--accent, #38bdf8)'
                    : '1px dashed rgba(56, 189, 248, 0.3)',
                  backgroundColor: isDraggingOver
                    ? 'rgba(56, 189, 248, 0.14)'
                    : 'rgba(24, 30, 46, 0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
                title="Drop image file here or click Browse"
              >
                <ImageIcon size={20} color="var(--accent, #38bdf8)" />
                <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 500 }}>
                  {isDraggingOver
                    ? 'Drop image here to apply'
                    : customBgPath
                    ? customBgPath.split('/').pop()
                    : 'Drag & drop image here or click Browse'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Supports PNG, JPG, WebP (auto-saved to wallpapers)
                </div>
              </div>

              {bgMode === 'custom' && (
                <div style={{ marginTop: '6px' }}>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={handleDrop}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '4px',
                      borderRadius: '6px',
                      border: isDraggingOver ? '2px dashed var(--accent, #38bdf8)' : '1px solid transparent',
                      backgroundColor: isDraggingOver ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
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

                  {wallpaperError && (
                    <div
                      className="wallpaper-error-banner"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '6px',
                        color: '#f87171',
                        fontSize: '12px',
                        lineHeight: '1.4',
                      }}
                    >
                      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                      <span>{wallpaperError}</span>
                    </div>
                  )}
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
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const opacity = isNaN(val) ? 0.85 : val;
                        document.documentElement.style.setProperty('--live-wallpaper-opacity', String(opacity));
                        document.documentElement.style.setProperty('--live-wallpaper-contrast-opacity', String(Math.max(0.2, 1 - opacity)));
                        setFormData((prev) => ({
                          ...prev,
                          terminal: {
                            ...prev.terminal,
                            background_opacity: opacity,
                          },
                        }));
                      }}
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
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const blur = isNaN(val) ? 0 : val;
                        document.documentElement.style.setProperty('--live-wallpaper-blur', `${Math.min(blur, 10)}px`);
                        setFormData((prev) => ({
                          ...prev,
                          terminal: {
                            ...prev.terminal,
                            background_blur: blur,
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Secret Masking Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              marginTop: '12px',
            }}>
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  {selectedLang === 'ja' ? 'リアルタイム機密情報マスク (Secret Masking)' : 'Real-time Secret Masking'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {selectedLang === 'ja'
                    ? 'ターミナル出力中の AWSキー、GitHubトークン、Bearerトークン、SSH秘密鍵、パスワードを自動検知して伏字化します'
                    : 'Automatically mask AWS keys, GitHub tokens, Bearer tokens, private keys, and passwords from terminal screen output'}
                </div>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={formData.terminal.mask_secrets ?? true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      terminal: { ...prev.terminal, mask_secrets: checked },
                    }));
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: (formData.terminal.mask_secrets ?? true) ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  transition: '0.2s',
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '18px',
                    width: '18px',
                    left: (formData.terminal.mask_secrets ?? true) ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }} />
                </span>
              </label>
            </div>

            {/* Autonomous Watchdog Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              marginTop: '10px',
            }}>
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  {selectedLang === 'ja' ? '自律型エラー監視・修正提案 (Autonomous Watchdog)' : 'Autonomous Error Watchdog'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {selectedLang === 'ja'
                    ? 'コマンド失敗時にバックグラウンドで即座にAIエラー解析を実行し、1-Clickクイック修正ボタンを提示します'
                    : 'Auto-analyze non-zero exit codes in background and provide 1-click quick fix actions'}
                </div>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={formData.terminal.watchdog_auto_analyze ?? true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      terminal: { ...prev.terminal, watchdog_auto_analyze: checked },
                    }));
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: (formData.terminal.watchdog_auto_analyze ?? true) ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  transition: '0.2s',
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '18px',
                    width: '18px',
                    left: (formData.terminal.watchdog_auto_analyze ?? true) ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Git & GitHub Integration Section */}
          <div className="settings-section">
            <div className="section-title">
              <GitBranch size={14} style={{ display: 'inline', marginRight: 6 }} />
              {t.settings.gitSectionTitle}
            </div>

            {/* Git Integration Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              marginBottom: '10px',
            }}>
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  {t.settings.gitEnabledLabel}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t.settings.gitEnabledDesc}
                </div>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={formData.git?.enabled ?? true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      git: {
                        enabled: checked,
                        restrict_to_github: prev.git?.restrict_to_github ?? true,
                      },
                    }));
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: (formData.git?.enabled ?? true) ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  transition: '0.2s',
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '18px',
                    width: '18px',
                    left: (formData.git?.enabled ?? true) ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }} />
                </span>
              </label>
            </div>

            {/* GitHub Only Policy Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
            }}>
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <ShieldCheck size={14} color="#38bdf8" />
                  <span>{t.settings.githubRestrictionLabel}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t.settings.githubRestrictionDesc}
                </div>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={formData.git?.restrict_to_github ?? true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      git: {
                        enabled: prev.git?.enabled ?? true,
                        restrict_to_github: checked,
                      },
                    }));
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: (formData.git?.restrict_to_github ?? true) ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  transition: '0.2s',
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '18px',
                    width: '18px',
                    left: (formData.git?.restrict_to_github ?? true) ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Kitty Graphics Protocol Section */}
          <div className="settings-section">
            <div className="section-title">
              <ImageIcon size={14} style={{ display: 'inline', marginRight: 6 }} />
              {t.settings.kittySectionTitle}
            </div>

            {/* Protocol Enabled Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              marginBottom: '10px',
            }}>
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  {t.settings.kittyEnabledLabel}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t.settings.kittyEnabledDesc}
                </div>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  id="toggle-kitty-enabled"
                  checked={formData.kitty_graphics?.enabled ?? true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: checked,
                        max_dimension: prev.kitty_graphics?.max_dimension ?? 4096,
                        max_payload_mb: prev.kitty_graphics?.max_payload_mb ?? 16,
                        cache_limit_mb: prev.kitty_graphics?.cache_limit_mb ?? 256,
                        allowed_dir: prev.kitty_graphics?.allowed_dir ?? '$HOME/Pictures',
                      },
                    }));
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: (formData.kitty_graphics?.enabled ?? true) ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  transition: '0.2s',
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '18px',
                    width: '18px',
                    left: (formData.kitty_graphics?.enabled ?? true) ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }} />
                </span>
              </label>
            </div>

            {/* Performance & Security Limits Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.settings.kittyMaxDimensionLabel}</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{formData.kitty_graphics?.max_dimension ?? 4096}px</span>
                </label>
                <input
                  type="number"
                  id="input-kitty-max-dimension"
                  style={inputStyle}
                  min={1024}
                  max={8192}
                  step={512}
                  value={formData.kitty_graphics?.max_dimension || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: prev.kitty_graphics?.enabled ?? true,
                        max_dimension: isNaN(val) ? 0 : val,
                        max_payload_mb: prev.kitty_graphics?.max_payload_mb ?? 16,
                        cache_limit_mb: prev.kitty_graphics?.cache_limit_mb ?? 256,
                        allowed_dir: prev.kitty_graphics?.allowed_dir ?? '$HOME/Pictures',
                      },
                    }));
                  }}
                  onBlur={() => {
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: prev.kitty_graphics?.enabled ?? true,
                        max_dimension: Math.max(1024, Math.min(8192, prev.kitty_graphics?.max_dimension || 4096)),
                        max_payload_mb: prev.kitty_graphics?.max_payload_mb ?? 16,
                        cache_limit_mb: prev.kitty_graphics?.cache_limit_mb ?? 256,
                        allowed_dir: prev.kitty_graphics?.allowed_dir ?? '$HOME/Pictures',
                      },
                    }));
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.settings.kittyMaxPayloadLabel}</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{formData.kitty_graphics?.max_payload_mb ?? 16}MB</span>
                </label>
                <input
                  type="number"
                  id="input-kitty-max-payload"
                  style={inputStyle}
                  min={4}
                  max={64}
                  step={4}
                  value={formData.kitty_graphics?.max_payload_mb || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: prev.kitty_graphics?.enabled ?? true,
                        max_dimension: prev.kitty_graphics?.max_dimension ?? 4096,
                        max_payload_mb: isNaN(val) ? 0 : val,
                        cache_limit_mb: prev.kitty_graphics?.cache_limit_mb ?? 256,
                        allowed_dir: prev.kitty_graphics?.allowed_dir ?? '$HOME/Pictures',
                      },
                    }));
                  }}
                  onBlur={() => {
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: prev.kitty_graphics?.enabled ?? true,
                        max_dimension: prev.kitty_graphics?.max_dimension ?? 4096,
                        max_payload_mb: Math.max(4, Math.min(64, prev.kitty_graphics?.max_payload_mb || 16)),
                        cache_limit_mb: prev.kitty_graphics?.cache_limit_mb ?? 256,
                        allowed_dir: prev.kitty_graphics?.allowed_dir ?? '$HOME/Pictures',
                      },
                    }));
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.settings.kittyCacheLimitLabel}</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{formData.kitty_graphics?.cache_limit_mb ?? 256}MB</span>
                </label>
                <input
                  type="number"
                  id="input-kitty-cache-limit"
                  style={inputStyle}
                  min={64}
                  max={1024}
                  step={64}
                  value={formData.kitty_graphics?.cache_limit_mb || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: prev.kitty_graphics?.enabled ?? true,
                        max_dimension: prev.kitty_graphics?.max_dimension ?? 4096,
                        max_payload_mb: prev.kitty_graphics?.max_payload_mb ?? 16,
                        cache_limit_mb: isNaN(val) ? 0 : val,
                        allowed_dir: prev.kitty_graphics?.allowed_dir ?? '$HOME/Pictures',
                      },
                    }));
                  }}
                  onBlur={() => {
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: prev.kitty_graphics?.enabled ?? true,
                        max_dimension: prev.kitty_graphics?.max_dimension ?? 4096,
                        max_payload_mb: prev.kitty_graphics?.max_payload_mb ?? 16,
                        cache_limit_mb: Math.max(64, Math.min(1024, prev.kitty_graphics?.cache_limit_mb || 256)),
                        allowed_dir: prev.kitty_graphics?.allowed_dir ?? '$HOME/Pictures',
                      },
                    }));
                  }}
                />
              </div>
            </div>

            {/* Allowed Directory Sandbox */}
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ color: '#94a3b8' }}>
                {t.settings.kittyAllowedDirLabel}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  id="input-kitty-allowed-dir"
                  style={inputStyle}
                  placeholder="$HOME/Pictures"
                  value={formData.kitty_graphics?.allowed_dir ?? '$HOME/Pictures'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: prev.kitty_graphics?.enabled ?? true,
                        max_dimension: prev.kitty_graphics?.max_dimension ?? 4096,
                        max_payload_mb: prev.kitty_graphics?.max_payload_mb ?? 16,
                        cache_limit_mb: prev.kitty_graphics?.cache_limit_mb ?? 256,
                        allowed_dir: val,
                      },
                    }));
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap', background: '#1b2234', color: '#f8fafc' }}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      kitty_graphics: {
                        enabled: prev.kitty_graphics?.enabled ?? true,
                        max_dimension: prev.kitty_graphics?.max_dimension ?? 4096,
                        max_payload_mb: prev.kitty_graphics?.max_payload_mb ?? 16,
                        cache_limit_mb: prev.kitty_graphics?.cache_limit_mb ?? 256,
                        allowed_dir: '$HOME/Pictures',
                      },
                    }))
                  }
                >
                  {t.common.clear || 'Reset'}
                </button>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                {t.settings.kittyAllowedDirDesc}
              </div>

              {/* Safety Warning for dangerous system paths */}
              {((dir: string) => {
                const trimmed = dir.trim();
                const isDangerous =
                  trimmed === '/' ||
                  trimmed === '/etc' ||
                  trimmed === '/usr' ||
                  trimmed === '/bin' ||
                  trimmed === '/sbin' ||
                  trimmed === '/lib' ||
                  trimmed === '/dev' ||
                  trimmed === '/proc' ||
                  trimmed === '/sys' ||
                  trimmed.includes('.ssh');
                return isDangerous;
              })(formData.kitty_graphics?.allowed_dir ?? '') && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '8px',
                    padding: '6px 10px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f87171',
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>{t.settings.kittyAllowedDirWarning}</span>
                </div>
              )}
            </div>
          </div>

          {/* Editor Settings Section */}
          <div className="settings-section">
            <div className="section-title">
              <FileCode size={14} style={{ display: 'inline', marginRight: 6, color: '#38bdf8' }} />
              {t.settings.editorSectionTitle}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div style={{ paddingRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  {t.settings.editorAutosaveLabel}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t.settings.editorAutosaveDesc}
                </div>
              </div>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  id="toggle-editor-autosave"
                  checked={formData.editor?.autosave ?? true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      editor: {
                        ...prev.editor,
                        autosave: checked,
                      },
                    }));
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: (formData.editor?.autosave ?? true) ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  transition: '0.2s',
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '18px',
                    width: '18px',
                    left: (formData.editor?.autosave ?? true) ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Quality Assurance & Test Verification Section */}
          {onOpenTestPlan && (
            <div className="settings-section">
              <div className="section-title">
                <ClipboardCheck size={14} style={{ display: 'inline', marginRight: 6, color: '#00f0ff' }} />
                {t.settings.testPlanSectionTitle}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.06), rgba(56, 189, 248, 0.04))',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  borderRadius: '8px',
                  marginTop: '6px',
                }}
              >
                <div style={{ paddingRight: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{t.settings.testPlanCardTitle}</span>
                    <span style={{ fontSize: '10px', background: 'rgba(0, 240, 255, 0.2)', color: '#00f0ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      81 Tests
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                    {t.settings.testPlanCardDesc}
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-open-test-plan-from-settings"
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    background: 'rgba(0, 240, 255, 0.12)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    color: '#00f0ff',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={onOpenTestPlan}
                >
                  <ClipboardCheck size={14} />
                  <span>{t.settings.testPlanBtn}</span>
                </button>
              </div>
            </div>
          )}

          {/* About / Licenses Section */}
          <div className="settings-section" id="settings-about-licenses-section">
            <div className="section-title">
              <Info size={14} style={{ display: 'inline', marginRight: 6, color: '#38bdf8' }} />
              {t.settings.aboutSectionTitle}
            </div>

            {/* About Waddle Hero Card */}
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(99, 102, 241, 0.05))',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 10px rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={waddleIcon}
                      alt="Waddle"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 6px var(--accent-glow))',
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.5px' }}>
                        {t.settings.aboutAppName}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                        }}
                      >
                        v0.1.0 · MIT License
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#a5b4fc', marginTop: '2px' }}>
                      {t.settings.aboutTagline}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
                {t.settings.aboutDescription}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                {t.settings.aboutWaddleLicense}
              </div>
            </div>

            {/* Acknowledgements Sub-section */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Heart size={13} style={{ color: '#f43f5e' }} />
                <span>{t.settings.acknowledgementsTitle}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '10px' }}>
                {t.settings.acknowledgementsIntro}
              </div>

              {/* Project Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '8px',
                }}
              >
                {ACKNOWLEDGED_PROJECTS.map((project) => (
                  <div
                    key={project.name}
                    id={`card-acknowledgement-${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                          {project.name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: '#cbd5e1',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {project.license}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                        {t.settings[project.descKey]}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                      <button
                        type="button"
                        id={`btn-oss-${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => handleOpenExternalUrl(project.url)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                        title={project.url}
                      >
                        <span>{project.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Licenses & Third-Party Notice Sub-section */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={13} style={{ color: '#38bdf8' }} />
                <span>{t.settings.licensesSectionTitle}</span>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '3px' }}>
                    Waddle (MIT License)
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                    {t.settings.licensesWaddleDesc}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '3px' }}>
                    Third-Party Dependencies & Compliance
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                    {t.settings.licensesThirdPartyDesc}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '3px' }}>
                    {t.settings.fontsPolicyTitle}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '4px' }}>
                    {t.settings.fontsPolicyDesc}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                    {t.settings.assetsPolicyDesc}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    paddingTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
                    {t.settings.licensesAuthoritativeDesc}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      id="btn-view-licenses-doc"
                      onClick={() =>
                        handleOpenExternalUrl(
                          selectedLang === 'ja'
                            ? 'https://github.com/wammed/Waddle/blob/main/LICENSES.ja.md'
                            : 'https://github.com/wammed/Waddle/blob/main/LICENSES.md'
                        )
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontWeight: 500,
                      }}
                    >
                      <Scale size={13} />
                      <span>{t.settings.viewLicensesDocBtn}</span>
                      <ExternalLink size={11} />
                    </button>

                    <button
                      type="button"
                      id="btn-view-license-file"
                      onClick={() => handleOpenExternalUrl('https://github.com/wammed/Waddle/blob/main/LICENSE')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontWeight: 500,
                      }}
                    >
                      <span>{t.settings.viewLicenseFileBtn}</span>
                      <ExternalLink size={11} />
                    </button>

                    <button
                      type="button"
                      id="btn-view-github-repo"
                      onClick={() => handleOpenExternalUrl('https://github.com/wammed/Waddle')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontWeight: 500,
                      }}
                    >
                      <span>{t.settings.viewRepoBtn}</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              </div>
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

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
} from 'lucide-react';
import { AppConfig, OllamaStatus } from '../types';
import { THEMES } from '../theme';
import { TauriApi } from '../services/tauriApi';

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

const FONT_OPTIONS = [
  { label: 'JetBrainsMono Nerd Font (推奨)', value: "'JetBrainsMono Nerd Font', 'JetBrains Mono', 'Symbols Nerd Font Mono', monospace" },
  { label: 'MesloLGS NF (Powerlevel10k / Oh My Posh)', value: "'MesloLGS NF', 'MesloLGS Nerd Font', 'Symbols Nerd Font Mono', monospace" },
  { label: 'FiraCode Nerd Font (リガチャ対応)', value: "'FiraCode Nerd Font', 'Fira Code', 'Symbols Nerd Font Mono', monospace" },
  { label: 'Hack Nerd Font', value: "'Hack Nerd Font', 'Hack', 'Symbols Nerd Font Mono', monospace" },
  { label: 'CaskaydiaCove Nerd Font (Cascadia Code)', value: "'CaskaydiaCove Nerd Font', 'Cascadia Code', 'Symbols Nerd Font Mono', monospace" },
  { label: 'SauceCodePro Nerd Font (Source Code Pro)', value: "'SauceCodePro Nerd Font', 'Source Code Pro', 'Symbols Nerd Font Mono', monospace" },
  { label: 'Symbols Nerd Font Only (記号フォールバック)', value: "'Symbols Nerd Font Mono', 'JetBrains Mono', monospace" },
  { label: 'システム等幅 (monospace)', value: 'monospace' },
  { label: 'カスタムフォント...', value: 'custom' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<AppConfig>({ ...config });
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
      const isKnownPreset = FONT_OPTIONS.some((f) => f.value === config.terminal.font_family);
      setIsCustomFont(!isKnownPreset && config.terminal.font_family !== 'custom');

      // Initialize background image state
      const bg = config.terminal.background_image;
      if (!bg || bg === 'none') {
        setBgMode('none');
        setCustomBgPath('');
      } else if (bg === 'preset_cyberpunk') {
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
      const path = customBgPath || '/home/susie/Pictures/wallpaper.jpg';
      setCustomBgPath(path);
      setFormData((prev) => ({
        ...prev,
        terminal: { ...prev.terminal, background_image: path },
      }));
    }
  };

  const handleCustomPathChange = (val: string) => {
    setCustomBgPath(val);
    setFormData((prev) => ({
      ...prev,
      terminal: { ...prev.terminal, background_image: val.trim() ? val : undefined },
    }));
  };

  // Local File Selector using browser FileReader
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomBgPath(file.name);
      setFormData((prev) => ({
        ...prev,
        terminal: { ...prev.terminal, background_image: dataUrl },
      }));
    };
    reader.readAsDataURL(file);
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
            <span>Waddle 設定 (Ollama Local AI & Appearance)</span>
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
          {/* Ollama Local AI Section */}
          <div className="settings-section">
            <div className="section-title">
              <HardDrive size={14} style={{ display: 'inline', marginRight: 6 }} />
              ローカル AI エンジン (Ollama)
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
                      Ollama 接続完了 (v{ollamaStatus.version || '0.x'}) - {ollamaStatus.models.length}個のモデル利用可能
                    </span>
                  ) : (
                    <span style={{ color: '#fda4af', fontWeight: 600 }}>
                      Ollama 未起動または未接続
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
                <span>モデル再取得</span>
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
                💡 <strong>Ollamaの起動方法:</strong> 別のターミナルで <code>ollama serve</code> を実行し、<code>ollama pull llama3.2</code> または <code>ollama pull deepseek-r1</code> を実行してください。
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8' }}>Ollama エンドポイント URL</label>
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

            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8' }}>使用するローカルモデル</label>
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
              <label className="form-label" style={{ color: '#94a3b8' }}>生成 Temperature ({formData.ai.temperature})</label>
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
              ターミナル外観
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#94a3b8' }}>カラーテーマ</label>
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
                <span>フォント (Font Family)</span>
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
                {FONT_OPTIONS.map((f) => (
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
                  placeholder="例: 'Hack', 'MesloLGS NF', monospace"
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
                <label className="form-label" style={{ color: '#94a3b8' }}>フォントサイズ (px)</label>
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
                <label className="form-label" style={{ color: '#94a3b8' }}>カーソルスタイル</label>
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
                  <option value="block" style={{ background: '#181e2e', color: '#f8fafc' }}>Block</option>
                  <option value="underline" style={{ background: '#181e2e', color: '#f8fafc' }}>Underline</option>
                  <option value="bar" style={{ background: '#181e2e', color: '#f8fafc' }}>Bar</option>
                </select>
              </div>
            </div>

            {/* Wallpaper & Background Image Section */}
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label className="form-label" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ImageIcon size={13} />
                <span>背景画像・壁紙 (Background Wallpaper)</span>
              </label>

              <select
                className="form-select"
                style={inputStyle}
                value={bgMode}
                onChange={(e) => handleBgModeChange(e.target.value as any)}
              >
                <option value="none" style={{ background: '#181e2e', color: '#f8fafc' }}>なし (デフォルトダーク背景)</option>
                <option value="preset_cyberpunk" style={{ background: '#181e2e', color: '#f8fafc' }}>Waddle Official Cyberpunk (公式壁紙)</option>
                <option value="custom" style={{ background: '#181e2e', color: '#f8fafc' }}>カスタム画像 (ファイル選択 / パス指定)...</option>
              </select>

              {bgMode === 'custom' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="例: /home/user/Pictures/wallpaper.jpg または https://..."
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
                    onClick={() => fileInputRef.current?.click()}
                    title="ローカル画像ファイルを参照"
                  >
                    <FolderOpen size={14} />
                    <span>参照...</span>
                  </button>
                </div>
              )}

              {bgMode !== 'none' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#94a3b8' }}>
                      画像不透明度 ({Math.round((formData.terminal.background_opacity ?? 0.85) * 100)}%)
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
                      背景ぼかし ({formData.terminal.background_blur ?? 0}px)
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
            キャンセル
          </button>
          <button id="btn-save-settings" className="btn-primary" onClick={handleSave}>
            {savedSuccess ? <Check size={14} /> : <Save size={14} />}
            <span>{savedSuccess ? '保存完了！' : '設定を保存'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
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

  const fetchOllamaStatus = async (endpoint?: string) => {
    setIsCheckingOllama(true);
    try {
      const status = await TauriApi.checkOllamaStatus(endpoint || formData.ai.ollama_endpoint);
      setOllamaStatus(status);
      // Auto-select first model if current is empty or not in list
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        style={{ width: '620px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-modal-header">
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
                background: ollamaStatus?.available ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${ollamaStatus?.available ? 'var(--success)' : 'var(--danger-border)'}`,
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
                style={{ padding: '4px 10px', fontSize: '11px' }}
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
                  color: 'var(--fg-muted)',
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
              <label className="form-label">Ollama エンドポイント URL</label>
              <input
                type="text"
                className="form-input"
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
              <label className="form-label">使用するローカルモデル</label>
              {ollamaStatus?.available && ollamaStatus.models.length > 0 ? (
                <select
                  className="form-select"
                  value={formData.ai.ollama_model}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ai: { ...formData.ai, ollama_model: e.target.value },
                    })
                  }
                >
                  {ollamaStatus.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-input"
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
              <label className="form-label">生成 Temperature ({formData.ai.temperature})</label>
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
              <label className="form-label">カラーテーマ</label>
              <select
                className="form-select"
                value={formData.terminal.theme}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    terminal: { ...formData.terminal, theme: e.target.value },
                  })
                }
              >
                {Object.values(THEMES).map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">フォントサイズ (px)</label>
                <input
                  type="number"
                  className="form-input"
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
                <label className="form-label">カーソルスタイル</label>
                <select
                  className="form-select"
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
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                  <option value="bar">Bar</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
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

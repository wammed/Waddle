import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Play,
  Copy,
  Check,
  X,
  ArrowRight,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface PipelineStage {
  id: string;
  command: string;
  explanation?: string;
}

interface PipelineBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (pipelineCommand: string) => void;
  initialCommand?: string;
}

const COMMON_PRESETS = [
  {
    name: 'Top 10 IP 集計 (アクセスログ)',
    stages: [
      { command: 'cat access.log', explanation: 'ログファイルを読み出す' },
      { command: "awk '{print $1}'", explanation: '第1カラム(クライアントIP)を抽出' },
      { command: 'sort', explanation: '同一IPを並べ替え' },
      { command: 'uniq -c', explanation: 'IPごとの出現件数を集計' },
      { command: 'sort -nr', explanation: '件数の多い順に降順ソート' },
      { command: 'head -n 10', explanation: '上位10件を抽出' },
    ],
  },
  {
    name: '大容量ディスク消費調査',
    stages: [
      { command: 'du -h --max-depth=1 .', explanation: 'カレント配下のフォルダサイズ一覧' },
      { command: 'sort -hr', explanation: '人間が読める単位(GB/MB)で降順ソート' },
      { command: 'head -n 10', explanation: '上位10件を表示' },
    ],
  },
  {
    name: 'メモリ消費プロセス上位',
    stages: [
      { command: 'ps aux', explanation: '全プロセス一覧を取得' },
      { command: 'sort -rk 4', explanation: '%MEM カラムで降順ソート' },
      { command: "awk '{print $2, $4, $11}'", explanation: 'PID, %MEM, コマンド名のみ抽出' },
      { command: 'head -n 10', explanation: 'トップ10を表示' },
    ],
  },
  {
    name: 'Git コミット著者別ランキング',
    stages: [
      { command: "git log --format='%an'", explanation: '全コミットの作者名を出力' },
      { command: 'sort', explanation: '作者名で並び替え' },
      { command: 'uniq -c', explanation: 'コミット数をカウント' },
      { command: 'sort -nr', explanation: 'コミット数降順ソート' },
    ],
  },
  {
    name: 'JSON 配列の抽出・整形 (jq)',
    stages: [
      { command: 'cat package.json', explanation: 'JSONファイルを出力' },
      { command: 'jq .dependencies', explanation: 'dependenciesオブジェクトを抽出' },
      { command: 'grep -v "[{}]"', explanation: 'ブラケット行を除外' },
      { command: 'wc -l', explanation: 'パッケージ行数をカウント' },
    ],
  },
];

const SUGGESTED_SNIPPETS = [
  'grep -i "error"',
  "awk '{print $1}'",
  'sort -u',
  'uniq -c',
  'sort -nr',
  'head -n 10',
  'tail -n 20',
  'wc -l',
  'sed "s/foo/bar/g"',
  'tr "a-z" "A-Z"',
  'cut -d "," -f 1',
  'jq "."',
];

export const PipelineBuilderModal: React.FC<PipelineBuilderModalProps> = ({
  isOpen,
  onClose,
  onExecute,
  initialCommand,
}) => {
  const [stages, setStages] = useState<PipelineStage[]>([
    { id: '1', command: 'cat app.log', explanation: 'ファイル内容を出力' },
    { id: '2', command: 'grep -i "error"', explanation: 'エラー行のみ抽出' },
    { id: '3', command: 'wc -l', explanation: '該当行数をカウント' },
  ]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialCommand && initialCommand.includes('|')) {
      const parts = initialCommand.split('|').map((p) => p.trim());
      setStages(
        parts.map((p, idx) => ({
          id: String(Date.now() + idx),
          command: p,
        }))
      );
    }
  }, [isOpen, initialCommand]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fullPipelineCommand = stages
    .map((s) => s.command.trim())
    .filter((c) => c.length > 0)
    .join(' | ');

  const addStage = (cmd: string = '') => {
    setStages((prev) => [
      ...prev,
      {
        id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        command: cmd || 'grep "pattern"',
      },
    ]);
  };

  const updateStage = (id: string, newCmd: string) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, command: newCmd } : s))
    );
  };

  const removeStage = (id: string) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    setStages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const applyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setStages(
      preset.stages.map((st, idx) => ({
        id: `st_${Date.now()}_${idx}`,
        command: st.command,
        explanation: st.explanation,
      }))
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullPipelineCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRun = () => {
    if (!fullPipelineCommand) return;
    onExecute(fullPipelineCommand);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '880px',
          maxWidth: '96vw',
          maxHeight: '88vh',
          backgroundColor: '#181825',
          border: '1px solid #313244',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#cdd6f4',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #313244',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #1e1e2e, #181825)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SlidersHorizontal size={20} color="#89b4fa" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#cdd6f4' }}>
                ビジュアル パイプライン ビルダー (Visual Pipeline Builder)
              </div>
              <div style={{ fontSize: '11px', color: '#a6adc8' }}>
                Linuxコマンドをパイプ (|) で視覚的に繋げて複雑な集計・加工処理を構築
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6c7086',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Presets Bar */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid #313244',
            backgroundColor: '#1e1e2e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#fab387',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <Sparkles size={12} />
            プリセット:
          </span>
          {COMMON_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              style={{
                background: '#11111b',
                border: '1px solid #313244',
                color: '#cdd6f4',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Stages List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {/* Step indicator */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(137, 180, 250, 0.15)',
                  border: '1px solid rgba(137, 180, 250, 0.3)',
                  color: '#89b4fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>

              {/* Stage Card */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#11111b',
                  border: '1px solid #313244',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <input
                  type="text"
                  value={stage.command}
                  onChange={(e) => updateStage(stage.id, e.target.value)}
                  placeholder="例: grep 'error'"
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#89b4fa',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />

                {/* Move & Delete controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => moveStage(idx, 'up')}
                    disabled={idx === 0}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: idx === 0 ? '#45475a' : '#a6adc8',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      padding: '2px',
                    }}
                    title="上へ移動"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveStage(idx, 'down')}
                    disabled={idx === stages.length - 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: idx === stages.length - 1 ? '#45475a' : '#a6adc8',
                      cursor: idx === stages.length - 1 ? 'default' : 'pointer',
                      padding: '2px',
                    }}
                    title="下へ移動"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => removeStage(stage.id)}
                    disabled={stages.length <= 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: stages.length <= 1 ? '#45475a' : '#f38ba8',
                      cursor: stages.length <= 1 ? 'default' : 'pointer',
                      padding: '2px',
                    }}
                    title="ステージを削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Pipe connection symbol */}
              {idx < stages.length - 1 && (
                <div
                  style={{
                    color: '#6c7086',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowRight size={16} />
                </div>
              )}
            </div>
          ))}

          {/* Add Stage button & Quick snippets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <button
              onClick={() => addStage()}
              style={{
                background: 'rgba(137, 180, 250, 0.1)',
                border: '1px dashed #89b4fa',
                color: '#89b4fa',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <Plus size={14} />
              パイプ (|) を追加
            </button>

            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, padding: '4px 0' }}>
              {SUGGESTED_SNIPPETS.slice(0, 6).map((snip, idx) => (
                <button
                  key={idx}
                  onClick={() => addStage(snip)}
                  style={{
                    background: '#181825',
                    border: '1px solid #313244',
                    color: '#a6adc8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + {snip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview & Action Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #313244',
            backgroundColor: '#11111b',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#6c7086', marginBottom: '4px', fontWeight: 600 }}>
              合成コマンドプレビュー:
            </div>
            <div
              style={{
                backgroundColor: '#181825',
                border: '1px solid #313244',
                borderRadius: '6px',
                padding: '10px 14px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#a6e3a1',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              $ {fullPipelineCommand || '# コマンドを入力してください'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={handleCopy}
              style={{
                background: '#1e1e2e',
                border: '1px solid #313244',
                color: copied ? '#a6e3a1' : '#cdd6f4',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'コピー完了' : 'コマンドをコピー'}
            </button>

            <button
              onClick={handleRun}
              style={{
                background: 'linear-gradient(135deg, #89b4fa, #b4befe)',
                border: 'none',
                color: '#11111b',
                borderRadius: '6px',
                padding: '7px 18px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(137, 180, 250, 0.3)',
              }}
            >
              <Play size={13} fill="#11111b" />
              ターミナルで即時実行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

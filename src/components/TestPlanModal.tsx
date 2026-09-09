import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck,
  X,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Download,
  Upload,
  Terminal,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  TEST_SUITES,
  TEST_CASES,
  TestStatus,
  TestExecutionRecord,
  generateMarkdownReport,
} from '../data/testPlanData';
import { useI18n } from '../i18n';

interface TestPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'waddle_test_plan_results_v1';

export const TestPlanModal: React.FC<TestPlanModalProps> = ({ isOpen, onClose }) => {
  const { language } = useI18n();
  const isJa = language === 'ja';

  // Execution Record State
  const [record, setRecord] = useState<TestExecutionRecord>(() => {
    const defaultRec: TestExecutionRecord = {
      date: new Date().toISOString().split('T')[0],
      tester: 'Waddle Quality Assurance Team',
      environment: typeof navigator !== 'undefined'
        ? `Linux (${navigator.platform || 'x86_64'}, WebKitGTK, Node.js >= 20, Rust >= 1.75)`
        : 'Linux (WebKitGTK, Node.js, Rust)',
      overallResult: 'IN PROGRESS',
      results: {},
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...defaultRec, ...parsed };
        }
      } catch (e) {
        console.error('Failed to load test plan record:', e);
      }
    }
    return defaultRec;
  });

  // Filters & Search
  const [selectedSuiteId, setSelectedSuiteId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | TestStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isMdPreviewOpen, setIsMdPreviewOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      } catch (e) {
        console.error('Failed to save test plan record:', e);
      }
    }
  }, [record]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMdPreviewOpen) {
          setIsMdPreviewOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMdPreviewOpen, onClose]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleCopyText = (text: string, id: string, msg: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      showToast(msg);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Status Updater
  const handleUpdateStatus = (tcId: string, status: TestStatus) => {
    setRecord((prev) => {
      const prevItem = prev.results[tcId] || { status: 'untested', note: '' };
      return {
        ...prev,
        results: {
          ...prev.results,
          [tcId]: {
            ...prevItem,
            status,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  };

  // Note Updater
  const handleUpdateNote = (tcId: string, note: string) => {
    setRecord((prev) => {
      const prevItem = prev.results[tcId] || { status: 'untested', note: '' };
      return {
        ...prev,
        results: {
          ...prev.results,
          [tcId]: {
            ...prevItem,
            note,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  };

  // Mark all filtered as pass
  const handleMarkAllFilteredPass = () => {
    setRecord((prev) => {
      const nextResults = { ...prev.results };
      filteredCases.forEach((tc) => {
        const prevItem = nextResults[tc.id] || { status: 'untested', note: '' };
        nextResults[tc.id] = { ...prevItem, status: 'pass', updatedAt: new Date().toISOString() };
      });
      return { ...prev, results: nextResults };
    });
    showToast(isJa ? '表示中の全項目を「合格」に設定しました' : 'Marked all filtered cases as PASS');
  };

  // Reset all
  const handleResetAll = () => {
    if (window.confirm(isJa ? 'すべてのテスト判定とメモを初期化しますか？' : 'Reset all test results and notes?')) {
      setRecord((prev) => ({ ...prev, results: {} }));
      showToast(isJa ? '全テスト結果をリセットしました' : 'All results reset');
    }
  };

  // JSON Export / Import
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(record, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waddle_test_results_${record.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(isJa ? 'JSON データを保存しました' : 'Saved JSON test results');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setRecord(parsed);
        showToast(isJa ? 'JSON データを復元しました' : 'Imported JSON test results');
      } catch (err: any) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Compute stats
  const stats = useMemo(() => {
    const total = TEST_CASES.length;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const tc of TEST_CASES) {
      const st = record.results[tc.id]?.status;
      if (st === 'pass') passed++;
      else if (st === 'fail') failed++;
      else if (st === 'skip') skipped++;
    }

    const untested = total - (passed + failed + skipped);
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { total, passed, failed, skipped, untested, rate };
  }, [record.results]);

  // Filtered test cases
  const filteredCases = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return TEST_CASES.filter((tc) => {
      if (selectedSuiteId !== 0 && tc.suiteId !== selectedSuiteId) return false;

      const currentStatus = record.results[tc.id]?.status || 'untested';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;

      if (query) {
        const matchId = tc.id.toLowerCase().includes(query);
        const matchTitle = tc.titleJa.toLowerCase().includes(query) || tc.title.toLowerCase().includes(query);
        const matchProc = tc.procedureJa.toLowerCase().includes(query) || tc.procedure.toLowerCase().includes(query);
        const matchExp = tc.expectedJa.toLowerCase().includes(query) || tc.expected.toLowerCase().includes(query);
        return matchId || matchTitle || matchProc || matchExp;
      }
      return true;
    });
  }, [selectedSuiteId, statusFilter, searchQuery, record.results]);

  const markdownReport = useMemo(() => {
    return generateMarkdownReport(record);
  }, [record]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-tauri-drag-region="false"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(4, 8, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="test-plan-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1280px',
          height: '92vh',
          backgroundColor: '#0c111d',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00f0ff, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#080c14',
                boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)',
              }}
            >
              <ClipboardCheck size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(0, 240, 255, 0.15)',
                    color: '#00f0ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                  }}
                >
                  PRE-RELEASE VERIFICATION
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {isJa ? 'Waddle 包括的検証テスト入力フォーム' : 'Waddle Comprehensive Test Verification Form'}
                </h2>
              </div>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {isJa ? '全 80 項目・9 スイートのリアルタイム合否判定 & エビデンス記録' : 'Real-time test verification & evidence recording for all 80 items across 9 suites'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsMdPreviewOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #00f0ff, #0284c7)',
                color: '#080c14',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)',
              }}
            >
              <FileText size={15} />
              <span>{isJa ? 'Markdown 出力' : 'Markdown Report'}</span>
            </button>
            <button
              onClick={handleExportJson}
              title={isJa ? 'JSON 保存' : 'Export JSON'}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={15} />
              <span>JSON</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title={isJa ? 'JSON 復元' : 'Import JSON'}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Upload size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportJson}
            />
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Metadata Inputs Bar */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'grid',
            gridTemplateColumns: '150px 180px 1fr 180px',
            gap: '14px',
          }}
        >
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              {isJa ? '検証日' : 'Date'}
            </label>
            <input
              type="date"
              value={record.date}
              onChange={(e) => setRecord((p) => ({ ...p, date: e.target.value }))}
              style={{
                width: '100%',
                background: '#080c14',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              {isJa ? 'テスター' : 'Tester'}
            </label>
            <input
              type="text"
              value={record.tester}
              onChange={(e) => setRecord((p) => ({ ...p, tester: e.target.value }))}
              placeholder="Name..."
              style={{
                width: '100%',
                background: '#080c14',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              {isJa ? '検証環境' : 'Environment'}
            </label>
            <input
              type="text"
              value={record.environment}
              onChange={(e) => setRecord((p) => ({ ...p, environment: e.target.value }))}
              placeholder="OS, Kernel, WebKitGTK..."
              style={{
                width: '100%',
                background: '#080c14',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              {isJa ? '総合判定' : 'Overall Status'}
            </label>
            <select
              value={record.overallResult}
              onChange={(e) => setRecord((p) => ({ ...p, overallResult: e.target.value as any }))}
              style={{
                width: '100%',
                background: '#080c14',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: record.overallResult === 'PASS' ? '#10b981' : record.overallResult === 'FAIL' ? '#f43f5e' : '#f59e0b',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
              }}
            >
              <option value="IN PROGRESS">⏳ IN PROGRESS</option>
              <option value="PASS">🟢 PASS (全件合格)</option>
              <option value="FAIL">🔴 FAIL (不合格あり)</option>
            </select>
          </div>
        </div>

        {/* Dashboard / Progress bar */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'rgba(12, 17, 29, 0.9)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>{isJa ? '総件数:' : 'Total:'}</span>
                <strong style={{ color: '#00f0ff', fontFamily: 'monospace', fontSize: '15px' }}>{stats.total}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>{isJa ? '合格:' : 'Pass:'}</span>
                <strong style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '15px' }}>{stats.passed}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>{isJa ? '不合格:' : 'Fail:'}</span>
                <strong style={{ color: '#f43f5e', fontFamily: 'monospace', fontSize: '15px' }}>{stats.failed}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>{isJa ? '保留:' : 'Skip:'}</span>
                <strong style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: '15px' }}>{stats.skipped}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>{isJa ? '未検証:' : 'Pending:'}</span>
                <strong style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '15px' }}>{stats.untested}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{isJa ? '合格率:' : 'Pass Rate:'}</span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: stats.rate === 100 ? '#10b981' : stats.rate > 50 ? '#00f0ff' : '#f59e0b',
                }}
              >
                {stats.rate}%
              </span>
            </div>
          </div>

          {/* Progress track */}
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#080c14',
              borderRadius: '999px',
              overflow: 'hidden',
              display: 'flex',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ width: `${(stats.passed / stats.total) * 100}%`, backgroundColor: '#10b981', transition: 'width 0.3s ease' }} />
            <div style={{ width: `${(stats.failed / stats.total) * 100}%`, backgroundColor: '#f43f5e', transition: 'width 0.3s ease' }} />
            <div style={{ width: `${(stats.skipped / stats.total) * 100}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s ease' }} />
            <div style={{ width: `${(stats.untested / stats.total) * 100}%`, backgroundColor: 'rgba(148, 163, 184, 0.15)', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Search and Suite Filter Tabs */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isJa ? '🔍 テストID、機能名、検証手順を検索...' : '🔍 Search test cases...'}
                style={{
                  width: '100%',
                  background: '#080c14',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 36px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: '3px', background: '#080c14', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {(['all', 'untested', 'pass', 'fail', 'skip'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    background: statusFilter === st ? (st === 'pass' ? '#10b981' : st === 'fail' ? '#f43f5e' : st === 'skip' ? '#f59e0b' : 'rgba(255, 255, 255, 0.25)') : 'transparent',
                    color: statusFilter === st && (st === 'pass' || st === 'skip') ? '#080c14' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleMarkAllFilteredPass}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#6ee7b7',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} />
                <span>{isJa ? '表示中をすべて合格にする' : 'Mark Filtered as PASS'}</span>
              </button>

              <button
                onClick={handleResetAll}
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fca5a5',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={14} />
                <span>{isJa ? 'リセット' : 'Reset'}</span>
              </button>
            </div>
          </div>

          {/* Suite selection pills */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
            }}
          >
            <button
              onClick={() => setSelectedSuiteId(0)}
              style={{
                background: selectedSuiteId === 0 ? 'rgba(0, 240, 255, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                border: `1px solid ${selectedSuiteId === 0 ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)'}`,
                color: selectedSuiteId === 0 ? '#00f0ff' : '#94a3b8',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{isJa ? '全スイート' : 'All Suites'}</span>
              <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.1)', padding: '1px 6px', borderRadius: '10px' }}>
                80
              </span>
            </button>

            {TEST_SUITES.map((s) => {
              const suiteCases = TEST_CASES.filter((c) => c.suiteId === s.id);
              const pCount = suiteCases.filter((c) => record.results[c.id]?.status === 'pass').length;
              const isSelected = selectedSuiteId === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSuiteId(s.id)}
                  style={{
                    background: isSelected ? 'rgba(0, 240, 255, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isSelected ? '#00f0ff' : '#94a3b8',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Suite {s.id}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      background: isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#080c14' : '#94a3b8',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {pCount}/{suiteCases.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Test Cards Body (Scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#080c14',
          }}
        >
          {filteredCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
              {isJa ? '条件に一致するテストケースが見つかりませんでした。' : 'No matching test cases found.'}
            </div>
          ) : (
            filteredCases.map((tc) => {
              const res = record.results[tc.id] || { status: 'untested', note: '' };
              const statusColor =
                res.status === 'pass'
                  ? '#10b981'
                  : res.status === 'fail'
                  ? '#f43f5e'
                  : res.status === 'skip'
                  ? '#f59e0b'
                  : 'rgba(148, 163, 184, 0.4)';

              const isAuto = tc.type.includes('Automated') || tc.type.includes('Scripted');

              return (
                <div
                  key={tc.id}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: `4px solid ${statusColor}`,
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Top Bar of card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          fontWeight: 700,
                          backgroundColor: 'rgba(0, 240, 255, 0.12)',
                          color: '#00f0ff',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                        }}
                      >
                        {tc.id}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: isAuto ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: isAuto ? '#d8b4fe' : '#94a3b8',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: isAuto ? '1px solid rgba(168, 85, 247, 0.3)' : 'none',
                        }}
                      >
                        {tc.type}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#fff' }}>
                        {isJa ? tc.titleJa : tc.title}
                      </strong>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        ({isJa ? tc.title : tc.titleJa})
                      </span>
                    </div>

                    {/* Status selection buttons */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        background: '#04060a',
                        padding: '3px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <button
                        onClick={() => handleUpdateStatus(tc.id, 'pass')}
                        style={{
                          background: res.status === 'pass' ? '#10b981' : 'transparent',
                          color: res.status === 'pass' ? '#080c14' : '#6ee7b7',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>PASS</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(tc.id, 'fail')}
                        style={{
                          background: res.status === 'fail' ? '#f43f5e' : 'transparent',
                          color: res.status === 'fail' ? '#fff' : '#fca5a5',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <XCircle size={13} />
                        <span>FAIL</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(tc.id, 'skip')}
                        style={{
                          background: res.status === 'skip' ? '#f59e0b' : 'transparent',
                          color: res.status === 'skip' ? '#080c14' : '#fcd34d',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertCircle size={13} />
                        <span>SKIP</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(tc.id, 'untested')}
                        style={{
                          background: res.status === 'untested' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                          color: res.status === 'untested' ? '#fff' : '#64748b',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        CLEAR
                      </button>
                    </div>
                  </div>

                  {/* Procedure and Expected */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        {isJa ? '検証手順' : 'Procedure'}
                      </span>
                      <div style={{ color: '#e2e8f0' }}>{isJa ? tc.procedureJa : tc.procedure}</div>

                      {tc.command && (
                        <div
                          style={{
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#04060a',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: '#38bdf8',
                          }}
                        >
                          <Terminal size={13} />
                          <span style={{ flex: 1, overflowX: 'auto', whiteSpace: 'nowrap' }}>{tc.command}</span>
                          <button
                            onClick={() => handleCopyText(tc.command!, tc.id, isJa ? 'コマンドをコピーしました' : 'Command copied')}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {copiedId === tc.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            <span>{copiedId === tc.id ? 'OK' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        {isJa ? '期待される結果' : 'Expected Result'}
                      </span>
                      <div style={{ color: '#e2e8f0' }}>{isJa ? tc.expectedJa : tc.expected}</div>
                    </div>
                  </div>

                  {/* Note Input */}
                  <div>
                    <input
                      type="text"
                      value={res.note || ''}
                      onChange={(e) => handleUpdateNote(tc.id, e.target.value)}
                      placeholder={isJa ? 'エビデンスメモ・特記事項・エラーログ (任意)...' : 'Evidence note or output (optional)...'}
                      style={{
                        width: '100%',
                        backgroundColor: '#080c14',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
            <span>{isJa ? 'スタンドアロン版:' : 'Standalone HTML:'}</span>
            <code style={{ background: '#04060a', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>
              tools/test_form.html
            </code>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(markdownReport).then(() => {
                  showToast(isJa ? 'Markdown レポートをクリップボードにコピーしました！' : 'Markdown report copied!');
                });
              }}
              style={{
                background: 'rgba(0, 240, 255, 0.15)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                color: '#00f0ff',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Copy size={15} />
              <span>{isJa ? 'Markdownをコピー' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isJa ? '閉じる' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Markdown Preview Overlay */}
      {isMdPreviewOpen && (
        <div
          onClick={() => setIsMdPreviewOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '80vh',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>
                📋 エビデンス記録 Markdown レポートプレビュー (TEST_PLAN.ja.md Section 5準拠)
              </h3>
              <button
                onClick={() => setIsMdPreviewOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', flex: 1, overflow: 'hidden', display: 'flex' }}>
              <textarea
                readOnly
                value={markdownReport}
                style={{
                  width: '100%',
                  height: '380px',
                  backgroundColor: '#080c14',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '12px',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => {
                  const blob = new Blob([markdownReport], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `WADDLE_TEST_REPORT_${record.date}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast(isJa ? 'Markdown ファイルを保存しました' : 'Saved markdown file');
                }}
                style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={14} />
                <span>{isJa ? 'ダウンロード' : 'Download .md'}</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(markdownReport).then(() => {
                    showToast(isJa ? 'クリップボードにコピーしました！' : 'Copied to clipboard!');
                  });
                }}
                style={{
                  background: 'linear-gradient(135deg, #00f0ff, #0284c7)',
                  color: '#080c14',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Copy size={14} />
                <span>{isJa ? 'コピーする' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#00f0ff',
            color: '#080c14',
            fontWeight: 700,
            fontSize: '13px',
            padding: '10px 18px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 240, 255, 0.5)',
            zIndex: 10002,
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>,
    document.body
  );
};

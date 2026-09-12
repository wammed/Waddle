import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  Table,
  Code,
  Copy,
  Check,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface RichPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  fileName: string;
  content: string;
}

export const RichPreviewModal: React.FC<RichPreviewModalProps> = ({
  isOpen,
  onClose,
  filePath,
  fileName,
  content,
}) => {
  const [copied, setCopied] = useState(false);
  const [csvSearch, setCsvSearch] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fileType = useMemo(() => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
    if (lower.endsWith('.csv')) return 'csv';
    if (lower.endsWith('.tsv')) return 'tsv';
    if (lower.endsWith('.json')) return 'json';
    return 'text';
  }, [fileName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // CSV / TSV Parsing
  const parsedCsv = useMemo(() => {
    if (fileType !== 'csv' && fileType !== 'tsv') return null;
    const delimiter = fileType === 'tsv' ? '\t' : ',';
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return null;

    const parseLine = (line: string): string[] => {
      if (delimiter === '\t') {
        return line.split('\t');
      }
      // Basic CSV regex parser for comma-separated
      const res: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          res.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      res.push(cur.trim());
      return res;
    };

    const headers = parseLine(lines[0]);
    const rawRows = lines.slice(1).map(parseLine);
    return { headers, rows: rawRows };
  }, [content, fileType]);

  // Filtered & Sorted CSV Rows
  const displayedRows = useMemo(() => {
    if (!parsedCsv) return [];
    let rows = parsedCsv.rows;

    if (csvSearch.trim()) {
      const q = csvSearch.toLowerCase();
      rows = rows.filter((r) => r.some((cell) => cell.toLowerCase().includes(q)));
    }

    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const valA = a[sortCol] || '';
        const valB = b[sortCol] || '';
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return rows;
  }, [parsedCsv, csvSearch, sortCol, sortAsc]);

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
  };

  // Pretty JSON
  const prettyJson = useMemo(() => {
    if (fileType !== 'json') return null;
    try {
      const obj = JSON.parse(content);
      return JSON.stringify(obj, null, 2);
    } catch {
      return content;
    }
  }, [content, fileType]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
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
          width: '950px',
          maxWidth: '96vw',
          height: '86vh',
          backgroundColor: '#181825',
          border: '1px solid #313244',
          borderRadius: '12px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
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
            padding: '14px 20px',
            borderBottom: '1px solid #313244',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #1e1e2e, #181825)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {fileType === 'markdown' && <FileText size={20} color="#89b4fa" />}
            {(fileType === 'csv' || fileType === 'tsv') && <Table size={20} color="#a6e3a1" />}
            {fileType === 'json' && <Code size={20} color="#fab387" />}
            {fileType === 'text' && <FileText size={20} color="#cdd6f4" />}

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '15px', color: '#cdd6f4' }}>
                  {fileName}
                </span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(137, 180, 250, 0.15)',
                    color: '#89b4fa',
                    border: '1px solid rgba(137, 180, 250, 0.3)',
                  }}
                >
                  {fileType}
                </span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#6c7086',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '550px',
                }}
                title={filePath}
              >
                {filePath}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: '1px solid #313244',
                color: copied ? '#a6e3a1' : '#a6adc8',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'コピー完了' : 'コピー'}
            </button>

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
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {fileType === 'markdown' && (
            <div
              style={{
                padding: '24px 32px',
                lineHeight: '1.7',
                fontSize: '14px',
                color: '#cdd6f4',
              }}
              className="rich-preview-markdown"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}

          {(fileType === 'csv' || fileType === 'tsv') && parsedCsv && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* CSV Toolbar */}
              <div
                style={{
                  padding: '10px 20px',
                  borderBottom: '1px solid #313244',
                  backgroundColor: '#1e1e2e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search
                    size={14}
                    color="#6c7086"
                    style={{ position: 'absolute', left: '10px', top: '8px' }}
                  />
                  <input
                    type="text"
                    placeholder="テーブル内を絞り込み..."
                    value={csvSearch}
                    onChange={(e) => setCsvSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      backgroundColor: '#11111b',
                      border: '1px solid #313244',
                      borderRadius: '6px',
                      color: '#cdd6f4',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#a6adc8' }}>
                  表示中: {displayedRows.length} / 全 {parsedCsv.rows.length} 行 ({parsedCsv.headers.length} 列)
                </div>
              </div>

              {/* Table Container */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#181825',
                      zIndex: 2,
                      borderBottom: '2px solid #313244',
                    }}
                  >
                    <tr>
                      <th style={{ padding: '8px 12px', color: '#6c7086', width: '40px' }}>#</th>
                      {parsedCsv.headers.map((h, idx) => (
                        <th
                          key={idx}
                          onClick={() => handleSort(idx)}
                          style={{
                            padding: '8px 12px',
                            color: '#89b4fa',
                            fontWeight: 600,
                            cursor: 'pointer',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{h || `Col ${idx + 1}`}</span>
                            {sortCol === idx ? (
                              sortAsc ? (
                                <ArrowUp size={12} />
                              ) : (
                                <ArrowDown size={12} />
                              )
                            ) : (
                              <ArrowUpDown size={12} color="#45475a" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: '1px solid #313244',
                          backgroundColor: rIdx % 2 === 0 ? '#11111b' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '7px 12px', color: '#6c7086', fontSize: '10px' }}>
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: '7px 12px',
                              color: '#cdd6f4',
                              whiteSpace: 'nowrap',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={cell}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {fileType === 'json' && (
            <div style={{ padding: '20px', height: '100%', boxSizing: 'border-box' }}>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: '#11111b',
                  border: '1px solid #313244',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#fab387',
                  overflowX: 'auto',
                  lineHeight: '1.5',
                }}
              >
                <code>{prettyJson}</code>
              </pre>
            </div>
          )}

          {fileType === 'text' && (
            <div style={{ padding: '20px', height: '100%', boxSizing: 'border-box' }}>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: '#11111b',
                  border: '1px solid #313244',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#cdd6f4',
                  overflowX: 'auto',
                  lineHeight: '1.5',
                }}
              >
                <code>{content}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

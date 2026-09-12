import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  FileImage,
  FileArchive,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  FolderPlus,
  FilePlus,
  Trash2,
  Terminal,
  PanelLeftClose,
  X,
  Loader2,
  GitCommit,
  Copy,
  Edit2,
  ExternalLink,
  Check,
} from 'lucide-react';
import { FileEntry, GitStatus, GitFileEntry } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';

interface FileTreeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cwd: string;
  gitStatus?: GitStatus;
  onOpenFile: (filePath: string) => void;
  onInsertToTerminal?: (text: string) => void;
  onOpenDiff?: (filePath: string, isStaged: boolean) => void;
  onRichPreview?: (filePath: string, fileName: string) => void;
}

interface FileLanguageMeta {
  ext: string;
  color: string;
  bgColor: string;
}

function getFileLanguageMeta(fileName: string): FileLanguageMeta {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.tsx')) return { ext: 'TSX', color: '#2dd4bf', bgColor: 'rgba(45, 212, 191, 0.15)' };
  if (lower.endsWith('.ts')) return { ext: 'TS', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.15)' };
  if (lower.endsWith('.jsx')) return { ext: 'JSX', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.15)' };
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return { ext: 'JS', color: '#facc15', bgColor: 'rgba(250, 204, 21, 0.15)' };
  if (lower.endsWith('.rs')) return { ext: 'RS', color: '#dea584', bgColor: 'rgba(222, 165, 132, 0.15)' };
  if (lower.endsWith('.py')) return { ext: 'PY', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.15)' };
  if (lower.endsWith('.json')) return { ext: 'JSON', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.15)' };
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return { ext: 'MD', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.15)' };
  if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.endsWith('.sass') || lower.endsWith('.less')) return { ext: 'CSS', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.15)' };
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return { ext: 'HTML', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)' };
  if (lower.endsWith('.sh') || lower.endsWith('.bash') || lower.endsWith('.zsh')) return { ext: 'SH', color: '#4ade80', bgColor: 'rgba(74, 222, 128, 0.15)' };
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return { ext: 'YML', color: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.15)' };
  if (lower.endsWith('.toml')) return { ext: 'TOML', color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.15)' };
  if (lower.endsWith('.sql')) return { ext: 'SQL', color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)' };
  if (lower.endsWith('.go')) return { ext: 'GO', color: '#00add8', bgColor: 'rgba(0, 173, 216, 0.15)' };
  if (lower.endsWith('.c') || lower.endsWith('.h')) return { ext: 'C', color: '#a8b9cc', bgColor: 'rgba(168, 185, 204, 0.15)' };
  if (lower.endsWith('.cpp') || lower.endsWith('.hpp') || lower.endsWith('.cc')) return { ext: 'C++', color: '#f34b7d', bgColor: 'rgba(243, 75, 125, 0.15)' };
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.ico') || lower.endsWith('.gif')) {
    return { ext: 'IMG', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' };
  }
  if (lower.endsWith('.zip') || lower.endsWith('.tar') || lower.endsWith('.gz') || lower.endsWith('.7z') || lower.endsWith('.zst')) {
    return { ext: 'ZIP', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)' };
  }
  if (lower.startsWith('.env') || lower === '.gitignore' || lower === '.dockerignore' || lower === 'dockerfile') {
    return { ext: 'CFG', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.15)' };
  }
  if (lower.endsWith('.lock')) {
    return { ext: 'LOCK', color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.15)' };
  }
  return { ext: 'FILE', color: 'var(--fg-muted)', bgColor: 'rgba(255, 255, 255, 0.05)' };
}

export const FileTreeSidebar: React.FC<FileTreeSidebarProps> = ({
  isOpen,
  onClose,
  cwd,
  gitStatus,
  onOpenFile,
  onInsertToTerminal,
  onOpenDiff,
  onRichPreview,
}) => {
  const { t } = useI18n();
  const [rootPath, setRootPath] = useState<string>(cwd);
  const [showHidden, setShowHidden] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [directoryCache, setDirectoryCache] = useState<Record<string, FileEntry[]>>({});
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Copied feedback toast / state
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: FileEntry;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // New file/folder inline prompt
  const [newEntryTarget, setNewEntryTarget] = useState<{
    parentPath: string;
    type: 'file' | 'folder';
  } | null>(null);
  const [newEntryName, setNewEntryName] = useState('');

  // Rename inline prompt
  const [renamingEntry, setRenamingEntry] = useState<FileEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Sync root with cwd when cwd changes
  useEffect(() => {
    if (cwd && cwd !== rootPath) {
      setRootPath(cwd);
      // Auto-expand root
      setExpandedPaths(new Set([cwd]));
    }
  }, [cwd]);

  // Close context menu on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setNewEntryTarget(null);
        setRenamingEntry(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Load a directory's contents
  const loadDirectory = useCallback(
    async (path: string) => {
      setLoadingPaths((prev) => new Set(prev).add(path));
      try {
        const entries = await TauriApi.readDirectory(path, showHidden);
        setDirectoryCache((prev) => ({ ...prev, [path]: entries }));
      } catch (err) {
        console.warn(`Failed to read directory: ${path}`, err);
      } finally {
        setLoadingPaths((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    },
    [showHidden]
  );

  // Initial load / refresh of root and expanded directories
  const refreshAll = useCallback(async () => {
    if (!rootPath) return;
    await loadDirectory(rootPath);
    // Reload currently expanded subdirectories as well
    const promises = Array.from(expandedPaths)
      .filter((p) => p !== rootPath)
      .map((p) => loadDirectory(p));
    await Promise.all(promises);
  }, [rootPath, expandedPaths, loadDirectory]);

  useEffect(() => {
    if (isOpen && rootPath) {
      loadDirectory(rootPath);
    }
  }, [isOpen, rootPath, showHidden, loadDirectory]);

  // Toggle folder expansion
  const toggleFolder = useCallback(
    async (folderPath: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const isExpanded = expandedPaths.has(folderPath);
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (isExpanded) {
          next.delete(folderPath);
        } else {
          next.add(folderPath);
        }
        return next;
      });

      if (!isExpanded && !directoryCache[folderPath]) {
        await loadDirectory(folderPath);
      }
    },
    [expandedPaths, directoryCache, loadDirectory]
  );

  // Collapse all folders except root
  const collapseAll = () => {
    setExpandedPaths(new Set(rootPath ? [rootPath] : []));
  };

  // Create new file or folder
  const handleConfirmCreate = async () => {
    if (!newEntryTarget || !newEntryName.trim()) {
      setNewEntryTarget(null);
      setNewEntryName('');
      return;
    }

    const fullPath = `${newEntryTarget.parentPath.replace(/\/$/, '')}/${newEntryName.trim()}`;
    try {
      if (newEntryTarget.type === 'file') {
        await TauriApi.createFile(fullPath);
        onOpenFile(fullPath);
      } else {
        await TauriApi.createDirectory(fullPath);
      }
      // Reload parent directory
      await loadDirectory(newEntryTarget.parentPath);
      setExpandedPaths((prev) => new Set(prev).add(newEntryTarget.parentPath));
    } catch (err) {
      alert(`${t.fileTree.createFailed}: ${err}`);
    } finally {
      setNewEntryTarget(null);
      setNewEntryName('');
    }
  };

  // Confirm rename
  const handleConfirmRename = async () => {
    if (!renamingEntry || !renameValue.trim() || renameValue.trim() === renamingEntry.name) {
      setRenamingEntry(null);
      return;
    }

    const parentPath = renamingEntry.path.substring(0, renamingEntry.path.lastIndexOf('/')) || rootPath;
    const newPath = `${parentPath.replace(/\/$/, '')}/${renameValue.trim()}`;
    try {
      await TauriApi.renameEntry(renamingEntry.path, newPath);
      await loadDirectory(parentPath);
      if (expandedPaths.has(renamingEntry.path)) {
        setExpandedPaths((prev) => {
          const next = new Set(prev);
          next.delete(renamingEntry.path);
          next.add(newPath);
          return next;
        });
      }
    } catch (err) {
      alert(`${t.fileTree.renameFailed}: ${err}`);
    } finally {
      setRenamingEntry(null);
    }
  };

  // Delete file or folder
  const handleDelete = async (entry: FileEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu(null);
    const typeStr = entry.is_dir ? t.fileTree.folderType : t.fileTree.fileType;
    if (confirm(t.fileTree.deleteConfirm(typeStr, entry.name))) {
      try {
        await TauriApi.deleteEntry(entry.path);
        // Reload parent directory
        const parentPath = entry.path.substring(0, entry.path.lastIndexOf('/')) || rootPath;
        await loadDirectory(parentPath);
      } catch (err) {
        alert(`${t.fileTree.deleteFailed}: ${err}`);
      }
    }
  };

  // Insert to terminal
  const handleInsert = (entry: FileEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu(null);
    if (onInsertToTerminal) {
      // Relative path if inside root, else full path
      const relative = entry.path.startsWith(rootPath)
        ? entry.path.replace(rootPath, '').replace(/^\//, './')
        : entry.path;
      onInsertToTerminal(`"${relative}" `);
    }
  };

  // Copy path helper
  const handleCopyPath = (entry: FileEntry, isAbsolute: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu(null);
    const textToCopy = isAbsolute
      ? entry.path
      : entry.path.startsWith(rootPath)
      ? entry.path.replace(rootPath, '').replace(/^\//, '')
      : entry.path;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedPath(entry.path);
      setTimeout(() => setCopiedPath(null), 1500);
    }
  };

  // Reveal in OS file manager
  const handleRevealInFileManager = async (entry: FileEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu(null);
    try {
      await TauriApi.revealInFileManager(entry.path);
    } catch (err) {
      console.error('Failed to reveal in file manager:', err);
    }
  };

  // Open context menu
  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPath(entry.path);

    // Clamp coordinates to prevent clipping
    const menuWidth = 220;
    const menuHeight = 280;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setContextMenu({ x, y, entry });
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const rootFolderName = useMemo(() => {
    if (!rootPath) return 'Files';
    const parts = rootPath.split('/').filter(Boolean);
    return parts[parts.length - 1] || rootPath;
  }, [rootPath]);

  // Clickable path breadcrumbs
  const pathBreadcrumbs = useMemo(() => {
    if (!rootPath) return [];
    const parts = rootPath.split('/').filter(Boolean);
    return parts.map((part, idx) => {
      const full = '/' + parts.slice(0, idx + 1).join('/');
      return { name: part, path: full };
    });
  }, [rootPath]);

  // Helper to match file with gitStatus
  const gitFilesMap = useMemo(() => {
    const map = new Map<string, GitFileEntry>();
    if (!gitStatus?.files) return map;
    for (const f of gitStatus.files) {
      map.set(f.path, f);
      if (!f.path.startsWith('/')) {
        map.set('/' + f.path, f);
      }
    }
    return map;
  }, [gitStatus?.files]);

  const getGitEntryForPath = useCallback(
    (entryPath: string): GitFileEntry | undefined => {
      if (!gitStatus?.files || !rootPath) return undefined;
      let rel = entryPath;
      if (entryPath.startsWith(rootPath)) {
        rel = entryPath.slice(rootPath.length).replace(/^[/\\]+/, '');
      }
      return gitFilesMap.get(rel) || gitFilesMap.get(entryPath);
    },
    [gitFilesMap, rootPath, gitStatus?.files]
  );

  const folderHasGitChanges = useCallback(
    (folderPath: string): boolean => {
      if (!gitStatus?.files || !rootPath) return false;
      let rel = folderPath;
      if (folderPath.startsWith(rootPath)) {
        rel = folderPath.slice(rootPath.length).replace(/^[/\\]+/, '');
      }
      const prefix = rel.endsWith('/') ? rel : rel + '/';
      return gitStatus.files.some((f) => f.path.startsWith(prefix));
    },
    [gitStatus?.files, rootPath]
  );

  // Icon helper based on file extension
  const renderFileIconWithBadge = (fileName: string) => {
    const meta = getFileLanguageMeta(fileName);
    const lower = fileName.toLowerCase();

    let baseIcon = <FileCode size={14} color={meta.color} />;
    if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.log')) {
      baseIcon = <FileText size={14} color={meta.color} />;
    } else if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.svg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.ico')
    ) {
      baseIcon = <FileImage size={14} color={meta.color} />;
    } else if (
      lower.endsWith('.tar') ||
      lower.endsWith('.gz') ||
      lower.endsWith('.zip') ||
      lower.endsWith('.zst')
    ) {
      baseIcon = <FileArchive size={14} color={meta.color} />;
    } else if (lower.endsWith('.sh') || lower.endsWith('.bash') || lower.endsWith('.zsh')) {
      baseIcon = <Terminal size={14} color={meta.color} />;
    } else if (meta.ext === 'FILE') {
      baseIcon = <File size={14} color="var(--fg-muted)" />;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        {baseIcon}
        {meta.ext !== 'FILE' && (
          <span
            className="file-lang-badge"
            style={{
              color: meta.color,
              borderColor: meta.color,
              background: meta.bgColor,
            }}
          >
            {meta.ext}
          </span>
        )}
      </div>
    );
  };

  // Recursive Tree Node renderer
  const renderTree = (parentPath: string, depth = 0) => {
    const entries = directoryCache[parentPath] || [];
    const filtered = searchFilter.trim()
      ? entries.filter((e) =>
          e.name.toLowerCase().includes(searchFilter.toLowerCase().trim())
        )
      : entries;

    if (loadingPaths.has(parentPath) && entries.length === 0) {
      return (
        <div
          style={{
            padding: '8px 12px',
            paddingLeft: `${depth * 14 + 20}px`,
            color: 'var(--fg-dim)',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Loader2 size={12} className="animate-spin" />
          <span>{t.common.loading}...</span>
        </div>
      );
    }

    return (
      <div className="tree-level">
        {/* Indentation guide line */}
        {depth > 0 && (
          <div
            className="tree-guide-line"
            style={{
              left: `${depth * 14 + 6}px`,
            }}
          />
        )}

        {filtered.map((entry) => {
          const isDir = entry.is_dir;
          const isExpanded = expandedPaths.has(entry.path);
          const isSelected = selectedPath === entry.path;
          const isLoading = loadingPaths.has(entry.path);
          const gitEntry = !isDir ? getGitEntryForPath(entry.path) : undefined;
          const hasFolderChanges = isDir && folderHasGitChanges(entry.path);
          const folderChildrenCount = isDir && directoryCache[entry.path]
            ? directoryCache[entry.path].length
            : null;

          return (
            <div key={entry.path} className="tree-node-wrapper">
              <div
                className={`tree-node-item ${isSelected ? 'selected' : ''}`}
                style={{
                  paddingLeft: `${depth * 14 + 8}px`,
                }}
                onClick={(e) => {
                  setSelectedPath(entry.path);
                  if (isDir) {
                    toggleFolder(entry.path, e);
                  } else {
                    onOpenFile(entry.path);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, entry)}
                title={`${entry.name} (${isDir ? t.fileTree.folderType : formatSize(entry.size)})\n${entry.path}${gitEntry ? ` [Git: ${gitEntry.status_code}]` : ''}`}
              >
                {/* Arrow / Folder Icon */}
                <div className="node-icon-wrapper">
                  {isDir ? (
                    <span
                      className="node-expand-arrow"
                      onClick={(e) => toggleFolder(entry.path, e)}
                    >
                      {isLoading ? (
                        <Loader2 size={12} className="animate-spin" color="var(--accent)" />
                      ) : isExpanded ? (
                        <ChevronDown size={13} color="var(--fg-muted)" />
                      ) : (
                        <ChevronRight size={13} color="var(--fg-muted)" />
                      )}
                    </span>
                  ) : (
                    <span style={{ width: '13px', display: 'inline-block' }} />
                  )}

                  {isDir ? (
                    isExpanded ? (
                      <FolderOpen size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                    ) : (
                      <Folder size={15} color="#eab308" style={{ flexShrink: 0 }} />
                    )
                  ) : (
                    renderFileIconWithBadge(entry.name)
                  )}
                </div>

                {/* File / Folder Name */}
                <span
                  className={`node-label ${isDir ? 'is-dir' : ''} ${
                    gitEntry
                      ? gitEntry.is_conflicted
                        ? 'git-text-conflict'
                        : gitEntry.staged
                        ? 'git-text-staged'
                        : gitEntry.is_untracked
                        ? 'git-text-untracked'
                        : 'git-text-modified'
                      : ''
                  }`}
                >
                  {entry.name}
                </span>

                {/* Folder Item Count Badge */}
                {isDir && folderChildrenCount !== null && (
                  <span className="tree-folder-count">
                    ({folderChildrenCount})
                  </span>
                )}

                {/* Folder change dot */}
                {isDir && hasFolderChanges && (
                  <span className="folder-git-dot" title="Contains modified files" />
                )}

                {/* File Size */}
                {!isDir && entry.size > 0 && (
                  <span className="tree-file-size">
                    {formatSize(entry.size)}
                  </span>
                )}

                {/* Git Status Badge */}
                {gitEntry && (
                  <span
                    className={`tree-git-badge ${
                      gitEntry.is_conflicted
                        ? 'git-badge-c'
                        : gitEntry.staged
                        ? 'git-badge-staged'
                        : gitEntry.is_untracked
                        ? 'git-badge-u'
                        : 'git-badge-m'
                    }`}
                    title={`Git: ${gitEntry.status_code}`}
                  >
                    {gitEntry.is_conflicted
                      ? 'C'
                      : gitEntry.staged
                      ? 'S'
                      : gitEntry.is_untracked
                      ? 'U'
                      : 'M'}
                  </span>
                )}

                {/* Hover Quick Action Buttons */}
                <div className="node-actions" onClick={(e) => e.stopPropagation()}>
                  {gitEntry && onOpenDiff && (
                    <button
                      className="node-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDiff(gitEntry.path, gitEntry.staged);
                      }}
                      title={`${t.gitPopover.viewDiffTooltip}: ${gitEntry.path}`}
                    >
                      <GitCommit size={12} color="var(--accent)" />
                    </button>
                  )}
                  {!isDir && (
                    <button
                      className="node-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFile(entry.path);
                      }}
                      title={t.fileTree.openInEditor}
                    >
                      <FileCode size={12} />
                    </button>
                  )}
                  {isDir && (
                    <button
                      className="node-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewEntryTarget({ parentPath: entry.path, type: 'file' });
                      }}
                      title={t.fileTree.newFile}
                    >
                      <FilePlus size={12} />
                    </button>
                  )}
                  <button
                    className="node-action-btn"
                    onClick={(e) => handleCopyPath(entry, false, e)}
                    title={t.fileTree.copyRelativePath}
                  >
                    {copiedPath === entry.path ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
                  <button
                    className="node-action-btn"
                    onClick={(e) => handleInsert(entry, e)}
                    title={t.fileTree.insertPath}
                  >
                    <Terminal size={12} />
                  </button>
                  <button
                    className="node-action-btn delete-btn"
                    onClick={(e) => handleDelete(entry, e)}
                    title={t.common.delete}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Recursive Children */}
              {isDir && isExpanded && renderTree(entry.path, depth + 1)}
            </div>
          );
        })}

        {filtered.length === 0 && !loadingPaths.has(parentPath) && (
          <div
            style={{
              padding: '6px 12px',
              paddingLeft: `${depth * 14 + 20}px`,
              color: 'var(--fg-dim)',
              fontSize: '11px',
              fontStyle: 'italic',
            }}
          >
            {searchFilter ? t.fileTree.noMatchingFiles : t.fileTree.emptyFolder}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <aside className="filetree-sidebar">
      {/* Sidebar Header */}
      <div className="filetree-header">
        <div className="filetree-title" title={rootPath}>
          <Folder size={15} color="var(--accent)" />
          <span className="filetree-title-text">{rootFolderName}</span>
        </div>

        <div className="filetree-toolbar">
          <button
            className="filetree-tool-btn"
            onClick={() => setNewEntryTarget({ parentPath: rootPath, type: 'file' })}
            title={t.fileTree.newFile}
          >
            <FilePlus size={13} />
          </button>
          <button
            className="filetree-tool-btn"
            onClick={() => setNewEntryTarget({ parentPath: rootPath, type: 'folder' })}
            title={t.fileTree.newFolder}
          >
            <FolderPlus size={13} />
          </button>
          <button
            className={`filetree-tool-btn ${showHidden ? 'active' : ''}`}
            onClick={() => setShowHidden(!showHidden)}
            title={showHidden ? t.fileTree.hideHidden : t.fileTree.showHidden}
          >
            {showHidden ? <Eye size={13} color="var(--accent)" /> : <EyeOff size={13} />}
          </button>
          <button
            className="filetree-tool-btn"
            onClick={refreshAll}
            title={t.fileTree.refresh}
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="filetree-tool-btn"
            onClick={collapseAll}
            title={t.fileTree.collapseAll}
          >
            <ChevronRight size={13} />
          </button>
          <button
            className="filetree-tool-btn"
            onClick={onClose}
            title={`${t.fileTree.closeSidebar} (Ctrl+B)`}
          >
            <PanelLeftClose size={13} />
          </button>
        </div>
      </div>

      {/* Interactive Breadcrumbs Bar */}
      <div className="filetree-breadcrumbs">
        <button
          className="filetree-breadcrumb-item"
          onClick={() => {
            setRootPath('/');
            setExpandedPaths(new Set(['/']));
          }}
          title="Root (/)"
        >
          /
        </button>
        {pathBreadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.path}>
            <span className="filetree-breadcrumb-sep">/</span>
            <button
              className={`filetree-breadcrumb-item ${idx === pathBreadcrumbs.length - 1 ? 'active' : ''}`}
              onClick={() => {
                setRootPath(crumb.path);
                setExpandedPaths(new Set([crumb.path]));
              }}
              title={crumb.path}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Quick Search Filter */}
      <div className="filetree-search-bar">
        <Search size={12} color="var(--fg-dim)" />
        <input
          type="text"
          placeholder={t.fileTree.searchPlaceholder}
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="filetree-search-input"
        />
        {searchFilter && (
          <button
            className="search-clear-btn"
            onClick={() => setSearchFilter('')}
            title={t.common.clear}
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Rename Prompt Bar */}
      {renamingEntry && (
        <div className="filetree-rename-dialog">
          <Edit2 size={13} color="#f59e0b" />
          <input
            type="text"
            autoFocus
            placeholder={t.fileTree.renamePlaceholder}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmRename();
              if (e.key === 'Escape') setRenamingEntry(null);
            }}
            className="filetree-rename-input"
          />
          <button
            className="btn-create-submit"
            style={{ background: '#f59e0b', color: '#000' }}
            onClick={handleConfirmRename}
            title={`${t.common.save} (Enter)`}
          >
            {t.common.save}
          </button>
          <button
            className="btn-create-cancel"
            onClick={() => setRenamingEntry(null)}
            title={`${t.common.cancel} (Esc)`}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* New File / Folder Prompt */}
      {newEntryTarget && (
        <div className="new-entry-inline-bar">
          {newEntryTarget.type === 'file' ? (
            <FilePlus size={13} color="var(--accent)" />
          ) : (
            <FolderPlus size={13} color="#f59e0b" />
          )}
          <input
            type="text"
            autoFocus
            placeholder={
              newEntryTarget.type === 'file'
                ? t.fileTree.newFilePlaceholder
                : t.fileTree.newFolderPlaceholder
            }
            value={newEntryName}
            onChange={(e) => setNewEntryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmCreate();
              if (e.key === 'Escape') setNewEntryTarget(null);
            }}
            className="new-entry-input"
          />
          <button
            className="btn-create-submit"
            onClick={handleConfirmCreate}
            title={`${t.common.create} (Enter)`}
          >
            {t.common.create}
          </button>
          <button
            className="btn-create-cancel"
            onClick={() => setNewEntryTarget(null)}
            title={`${t.common.cancel} (Esc)`}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Tree Content Container */}
      <div className="filetree-content">
        {rootPath ? (
          renderTree(rootPath, 0)
        ) : (
          <div className="filetree-empty">{t.fileTree.noDirectory}</div>
        )}
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="filetree-context-menu"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            {contextMenu.entry.name}
          </div>

          {!contextMenu.entry.is_dir && (
            <button
              className="context-menu-item"
              onClick={() => {
                setContextMenu(null);
                onOpenFile(contextMenu.entry.path);
              }}
            >
              <FileCode size={13} color="var(--accent)" />
              <span>{t.fileTree.openInEditor}</span>
            </button>
          )}

          {!contextMenu.entry.is_dir && onRichPreview && (
            <button
              className="context-menu-item"
              onClick={() => {
                const path = contextMenu.entry.path;
                const name = contextMenu.entry.name;
                setContextMenu(null);
                onRichPreview(path, name);
              }}
            >
              <Eye size={13} color="#a6e3a1" />
              <span>リッチプレビュー (Rich Preview)</span>
            </button>
          )}

          <button
            className="context-menu-item"
            onClick={() => handleInsert(contextMenu.entry)}
          >
            <Terminal size={13} color="#34d399" />
            <span>{t.fileTree.insertPath}</span>
          </button>

          <button
            className="context-menu-item"
            onClick={() => handleCopyPath(contextMenu.entry, false)}
          >
            <Copy size={13} />
            <span>{t.fileTree.copyRelativePath}</span>
          </button>

          <button
            className="context-menu-item"
            onClick={() => handleCopyPath(contextMenu.entry, true)}
          >
            <Copy size={13} color="var(--fg-dim)" />
            <span>{t.fileTree.copyAbsolutePath}</span>
          </button>

          <div className="context-menu-sep" />

          <button
            className="context-menu-item"
            onClick={() => handleRevealInFileManager(contextMenu.entry)}
          >
            <ExternalLink size={13} color="#38bdf8" />
            <span>{t.fileTree.revealInFileManager}</span>
          </button>

          {contextMenu.entry.is_dir && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  setNewEntryTarget({ parentPath: contextMenu.entry.path, type: 'file' });
                  setContextMenu(null);
                }}
              >
                <FilePlus size={13} color="var(--accent)" />
                <span>{t.fileTree.newFile}</span>
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  setNewEntryTarget({ parentPath: contextMenu.entry.path, type: 'folder' });
                  setContextMenu(null);
                }}
              >
                <FolderPlus size={13} color="#f59e0b" />
                <span>{t.fileTree.newFolder}</span>
              </button>
            </>
          )}

          <div className="context-menu-sep" />

          <button
            className="context-menu-item"
            onClick={() => {
              setRenamingEntry(contextMenu.entry);
              setRenameValue(contextMenu.entry.name);
              setContextMenu(null);
            }}
          >
            <Edit2 size={13} color="#f59e0b" />
            <span>{t.fileTree.rename}</span>
          </button>

          <button
            className="context-menu-item danger"
            onClick={() => handleDelete(contextMenu.entry)}
          >
            <Trash2 size={13} color="#f43f5e" />
            <span>{t.common.delete}</span>
          </button>
        </div>
      )}
    </aside>
  );
};

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { FileEntry } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';

interface FileTreeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cwd: string;
  onOpenFile: (filePath: string) => void;
  onInsertToTerminal?: (text: string) => void;
}

export const FileTreeSidebar: React.FC<FileTreeSidebarProps> = ({
  isOpen,
  onClose,
  cwd,
  onOpenFile,
  onInsertToTerminal,
}) => {
  const { t } = useI18n();
  const [rootPath, setRootPath] = useState<string>(cwd);
  const [showHidden, setShowHidden] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [directoryCache, setDirectoryCache] = useState<Record<string, FileEntry[]>>({});
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // New file/folder inline prompt
  const [newEntryTarget, setNewEntryTarget] = useState<{
    parentPath: string;
    type: 'file' | 'folder';
  } | null>(null);
  const [newEntryName, setNewEntryName] = useState('');

  // Sync root with cwd when cwd changes
  useEffect(() => {
    if (cwd && cwd !== rootPath) {
      setRootPath(cwd);
      // Auto-expand root
      setExpandedPaths(new Set([cwd]));
    }
  }, [cwd]);

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

  // Delete file or folder
  const handleDelete = async (entry: FileEntry, e: React.MouseEvent) => {
    e.stopPropagation();
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
  const handleInsert = (entry: FileEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInsertToTerminal) {
      // Relative path if inside root, else full path
      const relative = entry.path.startsWith(rootPath)
        ? entry.path.replace(rootPath, '').replace(/^\//, './')
        : entry.path;
      onInsertToTerminal(`"${relative}" `);
    }
  };

  // Icon helper based on file extension
  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
      return <FileCode size={14} color="#38bdf8" />;
    }
    if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
      return <FileCode size={14} color="#facc15" />;
    }
    if (lower.endsWith('.py')) {
      return <FileCode size={14} color="#60a5fa" />;
    }
    if (lower.endsWith('.rs')) {
      return <FileCode size={14} color="#fb923c" />;
    }
    if (lower.endsWith('.sh') || lower.endsWith('.bash') || lower.endsWith('.zsh')) {
      return <Terminal size={14} color="#34d399" />;
    }
    if (
      lower.endsWith('.json') ||
      lower.endsWith('.yaml') ||
      lower.endsWith('.yml') ||
      lower.endsWith('.toml')
    ) {
      return <FileCode size={14} color="#eab308" />;
    }
    if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.log')) {
      return <FileText size={14} color="#c084fc" />;
    }
    if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.svg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.ico')
    ) {
      return <FileImage size={14} color="#f472b6" />;
    }
    if (
      lower.endsWith('.tar') ||
      lower.endsWith('.gz') ||
      lower.endsWith('.zip') ||
      lower.endsWith('.zst')
    ) {
      return <FileArchive size={14} color="#fbbf24" />;
    }
    return <File size={14} color="var(--fg-muted)" />;
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
        {filtered.map((entry) => {
          const isDir = entry.is_dir;
          const isExpanded = expandedPaths.has(entry.path);
          const isSelected = selectedPath === entry.path;
          const isLoading = loadingPaths.has(entry.path);

          return (
            <div key={entry.path} className="tree-node-wrapper">
              <div
                className={`tree-node-item ${isSelected ? 'selected' : ''}`}
                style={{
                  paddingLeft: `${depth * 14 + 10}px`,
                }}
                onClick={(e) => {
                  setSelectedPath(entry.path);
                  if (isDir) {
                    toggleFolder(entry.path, e);
                  } else {
                    onOpenFile(entry.path);
                  }
                }}
                title={`${entry.name} (${isDir ? t.fileTree.folderType : formatSize(entry.size)})\n${entry.path}`}
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
                      <FolderOpen size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                    ) : (
                      <Folder size={14} color="#eab308" style={{ flexShrink: 0 }} />
                    )
                  ) : (
                    getFileIcon(entry.name)
                  )}
                </div>

                {/* File / Folder Name */}
                <span className={`node-label ${isDir ? 'is-dir' : ''}`}>
                  {entry.name}
                </span>

                {/* Hover Quick Action Buttons */}
                <div className="node-actions" onClick={(e) => e.stopPropagation()}>
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
              newEntryTarget.type === 'file' ? t.fileTree.newFilePlaceholder : t.fileTree.newFolderPlaceholder
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
    </aside>
  );
};

import { Language } from '../types';

export interface Translations {
  common: {
    cancel: string;
    save: string;
    saving: string;
    saved: string;
    close: string;
    delete: string;
    create: string;
    clear: string;
    loading: string;
    retry: string;
    error: string;
    browse: string;
    copy: string;
    copied: string;
    run: string;
    insert: string;
  };
  titleBar: {
    files: string;
    filesTooltip: string;
    layout: string;
    layoutTooltip: string;
    aiPrompt: string;
    aiPromptTooltip: string;
    editor: string;
    editorTooltip: string;
    copilot: string;
    copilotTooltip: string;
    settings: string;
    settingsTooltip: string;
    newTabTooltip: string;
    closeTabTooltip: string;
  };
  panes: {
    layoutSelectorTitle: string;
    single: string;
    split2H: string;
    split2V: string;
    split3LeftMain: string;
    split3TopMain: string;
    split3H: string;
    split3V: string;
    grid4: string;
    split4LeftMain: string;
    split4H: string;
    paneCount1: string;
    paneCount2: string;
    paneCount3: string;
    paneCount4: string;
    zoomPane: string;
    restorePane: string;
    closePane: string;
    activePaneBadge: string;
    toggle4Split: string;
  };
  fileTree: {
    title: string;
    newFile: string;
    newFolder: string;
    showHidden: string;
    hideHidden: string;
    refresh: string;
    collapseAll: string;
    closeSidebar: string;
    searchPlaceholder: string;
    newFilePlaceholder: string;
    newFolderPlaceholder: string;
    openInEditor: string;
    insertPath: string;
    deleteConfirm: (type: string, name: string) => string;
    folderType: string;
    fileType: string;
    emptyFolder: string;
    noMatchingFiles: string;
    createFailed: string;
    deleteFailed: string;
    noDirectory: string;
  };
  editor: {
    title: string;
    aiEdit: string;
    aiEditTooltip: string;
    runTooltip: string;
    saveTooltip: string;
    closeTooltip: string;
    pathPlaceholder: string;
    selectPlaceholder: string;
    textareaPlaceholder: string;
    reloadFilesTooltip: string;
    openFailed: string;
    aiModalTitle: string;
    aiPromptPlaceholder: string;
    applyAiEdit: string;
  };
  aiCommand: {
    title: string;
    promptPlaceholder: string;
    generate: string;
    dangerous: string;
    dangerousTooltip: string;
    alternatives: string;
    footerTip: string;
    insertBtn: string;
    runBtn: string;
  };
  copilot: {
    title: string;
    contextBadge: string;
    promptPlaceholder: string;
    welcomeMessage: string;
    exportChat: string;
    exportMarkdown: string;
    exportJson: string;
  };
  errorBanner: {
    detected: (command: string) => string;
    investigateBtn: string;
    details: string;
    cause: string;
    explanation: string;
    fixCommand: string;
    insertFix: string;
    runFix: string;
    analysisFailed: string;
    checkConnection: string;
  };
  statusBar: {
    copyPathTooltip: string;
    gitRepoTooltip: string;
    gitModified: string;
    gitUntracked: string;
    aiPromptTooltip: string;
    aiSettingsTooltip: string;
  };
  settings: {
    modalTitle: string;
    languageSectionTitle: string;
    languageLabel: string;
    languages: {
      enUS: string;
      enGB: string;
      ja: string;
    };
    aiSectionTitle: string;
    ollamaConnected: (version: string, count: number) => string;
    ollamaDisconnected: string;
    ollamaRefetch: string;
    ollamaHint: string;
    ollamaEndpointLabel: string;
    ollamaRemoteWarning: string;
    ollamaModelLabel: string;
    temperatureLabel: (temp: number) => string;
    terminalSectionTitle: string;
    themeLabel: string;
    fontLabel: string;
    customFontPlaceholder: string;
    fontSizeLabel: string;
    cursorStyleLabel: string;
    cursorBlock: string;
    cursorUnderline: string;
    cursorBar: string;
    wallpaperLabel: string;
    wallpaperNone: string;
    wallpaperOfficial: string;
    wallpaperCustom: string;
    wallpaperCustomPlaceholder: string;
    wallpaperOpacityLabel: (percent: number) => string;
    wallpaperBlurLabel: (px: number) => string;
    cancelBtn: string;
    saveBtn: string;
    savedBtn: string;
  };
  errorBoundary: {
    fallbackTitle: string;
    retry: string;
  };
  security: {
    dangerousWarningTitle: string;
    dangerousWarningDesc: string;
    dangerousConfirmRun: string;
    dangerousSafeInsert: string;
  };
  terminal: {
    search: string;
    searchPlaceholder: string;
    matchCase: string;
    useRegex: string;
    prevMatch: string;
    nextMatch: string;
    closeSearch: string;
  };
}

export const translations: Record<Language, Translations> = {
  'en-US': {
    common: {
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Saved!',
      close: 'Close',
      delete: 'Delete',
      create: 'Create',
      clear: 'Clear',
      loading: 'Loading...',
      retry: 'Retry',
      error: 'Error',
      browse: 'Browse...',
      copy: 'Copy',
      copied: 'Copied!',
      run: 'Run',
      insert: 'Insert',
    },
    titleBar: {
      files: 'Files',
      filesTooltip: 'Toggle File Tree Sidebar (Ctrl+B)',
      layout: 'Layout',
      layoutTooltip: 'Choose Split Layout (Alt+L, Alt+1~4)',
      aiPrompt: 'AI Prompt',
      aiPromptTooltip: 'AI Command Generator (Ctrl+K)',
      editor: 'Editor',
      editorTooltip: 'Toggle Embedded Editor (Ctrl+E)',
      copilot: 'Copilot',
      copilotTooltip: 'Toggle AI Copilot Sidebar',
      settings: 'Settings',
      settingsTooltip: 'Settings (Ctrl+,)',
      newTabTooltip: 'New Tab (Ctrl+T)',
      closeTabTooltip: 'Close tab',
    },
    panes: {
      layoutSelectorTitle: 'Terminal Layout',
      single: 'Single Pane (Full)',
      split2H: 'Side by Side (2 Columns)',
      split2V: 'Top & Bottom (2 Rows)',
      split3LeftMain: 'Left Main + 2 Right Stacked',
      split3TopMain: 'Top Main + 2 Bottom Columns',
      split3H: '3 Columns Side by Side',
      split3V: '3 Rows Stacked',
      grid4: '2×2 Grid (4 Panes)',
      split4LeftMain: 'Left Main + 3 Right Stacked',
      split4H: '4 Columns Side by Side',
      paneCount1: '1 Pane',
      paneCount2: '2 Panes',
      paneCount3: '3 Panes',
      paneCount4: '4 Panes',
      zoomPane: 'Zoom active pane (Alt+1)',
      restorePane: 'Restore split layout',
      closePane: 'Close pane (Ctrl+Shift+W)',
      activePaneBadge: 'Active',
      toggle4Split: '4-Way Split Grid (Alt+4)',
    },
    fileTree: {
      title: 'Files',
      newFile: 'New File',
      newFolder: 'New Folder',
      showHidden: 'Show Hidden Files',
      hideHidden: 'Hide Hidden Files',
      refresh: 'Refresh Tree',
      collapseAll: 'Collapse All',
      closeSidebar: 'Close Sidebar (Ctrl+B)',
      searchPlaceholder: 'Search files...',
      newFilePlaceholder: 'New file name...',
      newFolderPlaceholder: 'New folder name...',
      openInEditor: 'Open in Editor',
      insertPath: 'Insert path to terminal',
      deleteConfirm: (type, name) => `Are you sure you want to delete this ${type} "${name}"?`,
      folderType: 'folder',
      fileType: 'file',
      emptyFolder: '(Empty folder)',
      noMatchingFiles: 'No matching files',
      createFailed: 'Failed to create: ',
      deleteFailed: 'Failed to delete: ',
      noDirectory: 'No directory information',
    },
    editor: {
      title: 'Editor',
      aiEdit: 'AI Edit',
      aiEditTooltip: 'AI Code Assistant (Ctrl+Shift+K)',
      runTooltip: 'Run in Terminal',
      saveTooltip: 'Save file (Ctrl+S)',
      closeTooltip: 'Close Editor',
      pathPlaceholder: 'File path (e.g., script.sh or /path/to/file)',
      selectPlaceholder: 'Select file...',
      textareaPlaceholder: '# Enter script or code here... (Ctrl+S to save, Ctrl+Shift+K for AI edit)',
      reloadFilesTooltip: 'Reload directory files',
      openFailed: 'Failed to open file: ',
      aiModalTitle: 'Ollama AI Code Assistant',
      aiPromptPlaceholder: 'Enter instructions for code (e.g., add error handling, refactor to async, add comments)',
      applyAiEdit: 'Apply AI Edit',
    },
    aiCommand: {
      title: 'AI Command Assistant',
      promptPlaceholder: 'Describe what you want to do in natural language (e.g., undo last commit, kill process on port 8080)',
      generate: 'Generate',
      dangerous: 'DANGEROUS',
      dangerousTooltip: 'Caution: Potentially destructive command',
      alternatives: 'Alternatives:',
      footerTip: 'Press Enter to Insert, Ctrl+Enter to Run immediately, Esc to Cancel',
      insertBtn: 'Insert to Terminal',
      runBtn: 'Run',
    },
    copilot: {
      title: 'Waddle Copilot',
      contextBadge: 'Terminal Context',
      promptPlaceholder: 'Ask Copilot anything... (e.g., How do I parse JSON with jq?)',
      welcomeMessage:
        "Hello! I'm your Waddle AI Assistant.\nFeel free to ask me anything about terminal tasks, troubleshooting, or command generation.\n\nExamples:\n- `How do I find duplicate files in the current directory?`\n- `Explain the previous error output`\n- `What are the build steps for this project?`",
      exportChat: 'Export Chat',
      exportMarkdown: 'Export as Markdown (.md)',
      exportJson: 'Export as JSON (.json)',
    },
    errorBanner: {
      detected: (command) => `Command \`${command}\` failed with an error`,
      investigateBtn: 'Investigate & Fix with AI',
      details: 'Details',
      cause: 'Cause:',
      explanation: 'Explanation:',
      fixCommand: 'Fix:',
      insertFix: 'Insert',
      runFix: 'Run Fix',
      analysisFailed: 'Failed to analyze error',
      checkConnection: 'Please check your Ollama API settings or network connection.',
    },
    statusBar: {
      copyPathTooltip: 'Click to copy path',
      gitRepoTooltip: 'Git repository',
      gitModified: 'modified files',
      gitUntracked: 'untracked files',
      aiPromptTooltip: 'Open AI Command Generator (Ctrl+K)',
      aiSettingsTooltip: 'Click to change AI settings',
    },
    settings: {
      modalTitle: 'Waddle Settings (Ollama Local AI & Appearance)',
      languageSectionTitle: 'Language / 言語',
      languageLabel: 'Interface & Message Language',
      languages: {
        enUS: 'English (US)',
        enGB: 'English (UK / GB)',
        ja: '日本語 (Japanese)',
      },
      aiSectionTitle: 'Local AI Engine (Ollama)',
      ollamaConnected: (ver, count) => `Ollama Connected (v${ver || '0.x'}) - ${count} models available`,
      ollamaDisconnected: 'Ollama is not running or connected',
      ollamaRefetch: 'Refetch Models',
      ollamaHint: '💡 How to start Ollama: In another terminal, run `ollama serve`, then run `ollama pull llama3.2` or `ollama pull deepseek-r1`.',
      ollamaEndpointLabel: 'Ollama Endpoint URL',
      ollamaRemoteWarning: '⚠️ Security Warning: A remote Ollama endpoint is configured. Terminal logs, command history, and edited code will be transmitted over the network to this external host. Ensure this network is trusted and HTTPS is used.',
      ollamaModelLabel: 'Local Model to Use',
      temperatureLabel: (temp) => `Generation Temperature (${temp})`,
      terminalSectionTitle: 'Terminal Appearance',
      themeLabel: 'Color Theme',
      fontLabel: 'Font Family',
      customFontPlaceholder: "e.g., 'Hack', 'MesloLGS NF', monospace",
      fontSizeLabel: 'Font Size (px)',
      cursorStyleLabel: 'Cursor Style',
      cursorBlock: 'Block',
      cursorUnderline: 'Underline',
      cursorBar: 'Bar',
      wallpaperLabel: 'Background Wallpaper',
      wallpaperNone: 'None (Default dark background)',
      wallpaperOfficial: 'Waddle Official (Official Wallpaper)',
      wallpaperCustom: 'Custom Image (File Picker / Path)...',
      wallpaperCustomPlaceholder: 'e.g., /home/user/Pictures/wallpaper.jpg or https://...',
      wallpaperOpacityLabel: (percent) => `Image Opacity (${percent}%)`,
      wallpaperBlurLabel: (px) => `Background Blur (${px}px)`,
      cancelBtn: 'Cancel',
      saveBtn: 'Save Settings',
      savedBtn: 'Saved!',
    },
    errorBoundary: {
      fallbackTitle: 'An error occurred in the component',
      retry: 'Retry',
    },
    security: {
      dangerousWarningTitle: 'Dangerous Command Warning',
      dangerousWarningDesc: 'This command contains potentially destructive operations (file deletion, system modification, or elevated privileges). Are you sure you want to execute it directly?',
      dangerousConfirmRun: 'Execute Anyway',
      dangerousSafeInsert: 'Insert into Terminal (Safe)',
    },
    terminal: {
      search: 'Search in Terminal',
      searchPlaceholder: 'Find in terminal (Enter / Shift+Enter)...',
      matchCase: 'Match Case',
      useRegex: 'Use Regular Expression',
      prevMatch: 'Previous Match',
      nextMatch: 'Next Match',
      closeSearch: 'Close Search (Esc)',
    },
  },

  'en-GB': {
    common: {
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Saved!',
      close: 'Close',
      delete: 'Delete',
      create: 'Create',
      clear: 'Clear',
      loading: 'Loading...',
      retry: 'Retry',
      error: 'Error',
      browse: 'Browse...',
      copy: 'Copy',
      copied: 'Copied!',
      run: 'Run',
      insert: 'Insert',
    },
    titleBar: {
      files: 'Files',
      filesTooltip: 'Toggle File Tree Sidebar (Ctrl+B)',
      layout: 'Layout',
      layoutTooltip: 'Choose Split Layout (Alt+L, Alt+1~4)',
      aiPrompt: 'AI Prompt',
      aiPromptTooltip: 'AI Command Generator (Ctrl+K)',
      editor: 'Editor',
      editorTooltip: 'Toggle Embedded Editor (Ctrl+E)',
      copilot: 'Copilot',
      copilotTooltip: 'Toggle AI Copilot Sidebar',
      settings: 'Settings',
      settingsTooltip: 'Settings (Ctrl+,)',
      newTabTooltip: 'New Tab (Ctrl+T)',
      closeTabTooltip: 'Close tab',
    },
    panes: {
      layoutSelectorTitle: 'Terminal Layout',
      single: 'Single Pane (Full)',
      split2H: 'Side by Side (2 Columns)',
      split2V: 'Top & Bottom (2 Rows)',
      split3LeftMain: 'Left Main + 2 Right Stacked',
      split3TopMain: 'Top Main + 2 Bottom Columns',
      split3H: '3 Columns Side by Side',
      split3V: '3 Rows Stacked',
      grid4: '2×2 Grid (4 Panes)',
      split4LeftMain: 'Left Main + 3 Right Stacked',
      split4H: '4 Columns Side by Side',
      paneCount1: '1 Pane',
      paneCount2: '2 Panes',
      paneCount3: '3 Panes',
      paneCount4: '4 Panes',
      zoomPane: 'Zoom active pane (Alt+1)',
      restorePane: 'Restore split layout',
      closePane: 'Close pane (Ctrl+Shift+W)',
      activePaneBadge: 'Active',
      toggle4Split: '4-Way Split Grid (Alt+4)',
    },
    fileTree: {
      title: 'Files',
      newFile: 'New File',
      newFolder: 'New Folder',
      showHidden: 'Show Hidden Files',
      hideHidden: 'Hide Hidden Files',
      refresh: 'Refresh Tree',
      collapseAll: 'Collapse All',
      closeSidebar: 'Close Sidebar (Ctrl+B)',
      searchPlaceholder: 'Search files...',
      newFilePlaceholder: 'New file name...',
      newFolderPlaceholder: 'New folder name...',
      openInEditor: 'Open in Editor',
      insertPath: 'Insert path to terminal',
      deleteConfirm: (type, name) => `Are you sure you want to delete this ${type} "${name}"?`,
      folderType: 'folder',
      fileType: 'file',
      emptyFolder: '(Empty folder)',
      noMatchingFiles: 'No matching files',
      createFailed: 'Failed to create: ',
      deleteFailed: 'Failed to delete: ',
      noDirectory: 'No directory information',
    },
    editor: {
      title: 'Editor',
      aiEdit: 'AI Edit',
      aiEditTooltip: 'AI Code Assistant (Ctrl+Shift+K)',
      runTooltip: 'Run in Terminal',
      saveTooltip: 'Save file (Ctrl+S)',
      closeTooltip: 'Close Editor',
      pathPlaceholder: 'File path (e.g. script.sh or /path/to/file)',
      selectPlaceholder: 'Select file...',
      textareaPlaceholder: '# Enter script or code here... (Ctrl+S to save, Ctrl+Shift+K for AI edit)',
      reloadFilesTooltip: 'Reload directory files',
      openFailed: 'Failed to open file: ',
      aiModalTitle: 'Ollama AI Code Assistant',
      aiPromptPlaceholder: 'Enter instructions for code (e.g. add error handling, refactor to async, add comments)',
      applyAiEdit: 'Apply AI Edit',
    },
    aiCommand: {
      title: 'AI Command Assistant',
      promptPlaceholder: 'Describe what you want to do in natural language (e.g. undo last commit, terminate process on port 8080)',
      generate: 'Generate',
      dangerous: 'DANGEROUS',
      dangerousTooltip: 'Caution: Potentially destructive command',
      alternatives: 'Alternatives:',
      footerTip: 'Press Enter to Insert, Ctrl+Enter to Run immediately, Esc to Cancel',
      insertBtn: 'Insert to Terminal',
      runBtn: 'Run',
    },
    copilot: {
      title: 'Waddle Copilot',
      contextBadge: 'Terminal Context',
      promptPlaceholder: 'Ask Copilot anything... (e.g. How do I parse JSON with jq?)',
      welcomeMessage:
        "Hello! I'm your Waddle AI Assistant.\nFeel free to ask me anything about terminal tasks, troubleshooting, or command generation.\n\nExamples:\n- `How do I find duplicate files in the current directory?`\n- `Explain the previous error output`\n- `What are the build steps for this project?`",
      exportChat: 'Export Chat',
      exportMarkdown: 'Export as Markdown (.md)',
      exportJson: 'Export as JSON (.json)',
    },
    errorBanner: {
      detected: (command) => `Command \`${command}\` failed with an error`,
      investigateBtn: 'Analyse & Fix with AI',
      details: 'Details',
      cause: 'Cause:',
      explanation: 'Explanation:',
      fixCommand: 'Fix:',
      insertFix: 'Insert',
      runFix: 'Run Fix',
      analysisFailed: 'Failed to analyse error',
      checkConnection: 'Please check your Ollama API settings or network connection.',
    },
    statusBar: {
      copyPathTooltip: 'Click to copy path',
      gitRepoTooltip: 'Git repository',
      gitModified: 'modified files',
      gitUntracked: 'untracked files',
      aiPromptTooltip: 'Open AI Command Generator (Ctrl+K)',
      aiSettingsTooltip: 'Click to change AI settings',
    },
    settings: {
      modalTitle: 'Waddle Settings (Ollama Local AI & Appearance)',
      languageSectionTitle: 'Language / 言語',
      languageLabel: 'Interface & Message Language',
      languages: {
        enUS: 'English (US)',
        enGB: 'English (UK / GB)',
        ja: '日本語 (Japanese)',
      },
      aiSectionTitle: 'Local AI Engine (Ollama)',
      ollamaConnected: (ver, count) => `Ollama Connected (v${ver || '0.x'}) - ${count} models available`,
      ollamaDisconnected: 'Ollama is not running or connected',
      ollamaRefetch: 'Refetch Models',
      ollamaHint: '💡 How to start Ollama: In another terminal, run `ollama serve`, then run `ollama pull llama3.2` or `ollama pull deepseek-r1`.',
      ollamaEndpointLabel: 'Ollama Endpoint URL',
      ollamaRemoteWarning: '⚠️ Security Warning: A remote Ollama endpoint is configured. Terminal logs, command history, and edited code will be transmitted over the network to this external host. Ensure this network is trusted and HTTPS is used.',
      ollamaModelLabel: 'Local Model to Use',
      temperatureLabel: (temp) => `Generation Temperature (${temp})`,
      terminalSectionTitle: 'Terminal Appearance',
      themeLabel: 'Colour Theme',
      fontLabel: 'Font Family',
      customFontPlaceholder: "e.g. 'Hack', 'MesloLGS NF', monospace",
      fontSizeLabel: 'Font Size (px)',
      cursorStyleLabel: 'Cursor Style',
      cursorBlock: 'Block',
      cursorUnderline: 'Underline',
      cursorBar: 'Bar',
      wallpaperLabel: 'Background Wallpaper',
      wallpaperNone: 'None (Default dark background)',
      wallpaperOfficial: 'Waddle Official (Official Wallpaper)',
      wallpaperCustom: 'Custom Image (File Picker / Path)...',
      wallpaperCustomPlaceholder: 'e.g. /home/user/Pictures/wallpaper.jpg or https://...',
      wallpaperOpacityLabel: (percent) => `Image Opacity (${percent}%)`,
      wallpaperBlurLabel: (px) => `Background Blur (${px}px)`,
      cancelBtn: 'Cancel',
      saveBtn: 'Save Settings',
      savedBtn: 'Saved!',
    },
    errorBoundary: {
      fallbackTitle: 'An error occurred in the component',
      retry: 'Retry',
    },
    security: {
      dangerousWarningTitle: 'Dangerous Command Warning',
      dangerousWarningDesc: 'This command contains potentially destructive operations (file deletion, system modification, or elevated privileges). Are you sure you want to execute it directly?',
      dangerousConfirmRun: 'Execute Anyway',
      dangerousSafeInsert: 'Insert into Terminal (Safe)',
    },
    terminal: {
      search: 'Search in Terminal',
      searchPlaceholder: 'Find in terminal (Enter / Shift+Enter)...',
      matchCase: 'Match Case',
      useRegex: 'Use Regular Expression',
      prevMatch: 'Previous Match',
      nextMatch: 'Next Match',
      closeSearch: 'Close Search (Esc)',
    },
  },

  ja: {
    common: {
      cancel: 'キャンセル',
      save: '保存',
      saving: '保存中...',
      saved: '保存完了！',
      close: '閉じる',
      delete: '削除',
      create: '作成',
      clear: 'クリア',
      loading: '読み込み中...',
      retry: '再試行',
      error: 'エラー',
      browse: '参照...',
      copy: 'コピー',
      copied: 'コピー完了！',
      run: '実行',
      insert: '挿入',
    },
    titleBar: {
      files: 'Files',
      filesTooltip: 'ファイルツリーサイドバーの表示切替 (Ctrl+B)',
      layout: '分割',
      layoutTooltip: '画面分割レイアウトを選択 (Alt+L, Alt+1~4)',
      aiPrompt: 'AI Prompt',
      aiPromptTooltip: 'AI コマンド生成 (Ctrl+K)',
      editor: 'Editor',
      editorTooltip: '簡易内蔵エディタの表示切替 (Ctrl+E)',
      copilot: 'Copilot',
      copilotTooltip: 'AI Copilot サイドバーの表示切替',
      settings: 'Settings',
      settingsTooltip: '設定 (Ctrl+,)',
      newTabTooltip: '新規タブ (Ctrl+T)',
      closeTabTooltip: 'タブを閉じる',
    },
    panes: {
      layoutSelectorTitle: '画面分割レイアウト',
      single: '単一ペイン (全画面)',
      split2H: '左右2分割 (2列)',
      split2V: '上下2分割 (2段)',
      split3LeftMain: '左メイン ＋ 右2段',
      split3TopMain: '上メイン ＋ 下2列',
      split3H: '左右3列並列',
      split3V: '上下3段並列',
      grid4: '2×2グリッド (4分割)',
      split4LeftMain: '左メイン ＋ 右3段',
      split4H: '左右4列並列',
      paneCount1: '1ペイン',
      paneCount2: '2分割',
      paneCount3: '3分割',
      paneCount4: '4分割',
      zoomPane: 'アクティブペインを最大化 (Alt+1)',
      restorePane: '分割レイアウトに戻す',
      closePane: 'ペインを閉じる (Ctrl+Shift+W)',
      activePaneBadge: 'アクティブ',
      toggle4Split: '4分割グリッド (Alt+4)',
    },
    fileTree: {
      title: 'ファイル',
      newFile: '新規ファイル作成',
      newFolder: '新規フォルダ作成',
      showHidden: '隠しファイルを表示',
      hideHidden: '隠しファイルを非表示',
      refresh: 'ツリー再読込',
      collapseAll: 'すべて折りたたむ',
      closeSidebar: 'サイドバーを閉じる (Ctrl+B)',
      searchPlaceholder: 'ファイルを検索...',
      newFilePlaceholder: '新しいファイル名...',
      newFolderPlaceholder: '新しいフォルダ名...',
      openInEditor: '内蔵エディタで開く',
      insertPath: 'ターミナルにパスを挿入',
      deleteConfirm: (type, name) => `本当にこの${type}「${name}」を削除しますか？`,
      folderType: 'フォルダ',
      fileType: 'ファイル',
      emptyFolder: '(空のフォルダ)',
      noMatchingFiles: '該当ファイルなし',
      createFailed: '作成に失敗しました: ',
      deleteFailed: '削除に失敗しました: ',
      noDirectory: 'ディレクトリ情報がありません',
    },
    editor: {
      title: 'Editor',
      aiEdit: 'AI Edit',
      aiEditTooltip: 'AI Code Assistant (Ctrl+Shift+K)',
      runTooltip: 'Run in Terminal',
      saveTooltip: 'Save file (Ctrl+S)',
      closeTooltip: 'エディタを閉じる',
      pathPlaceholder: 'ファイルパス (例: script.sh または /path/to/file)',
      selectPlaceholder: 'ファイル選択...',
      textareaPlaceholder: '# スクリプトやコードをここに入力... (Ctrl+Sで保存, Ctrl+Shift+KでAI編集)',
      reloadFilesTooltip: 'ディレクトリのファイルを再取得',
      openFailed: 'ファイルを開けませんでした: ',
      aiModalTitle: 'Ollama AI Code Assistant',
      aiPromptPlaceholder: 'コードへの指示を入力 (例: エラーハンドリングを追加して, 非同期処理にリファクタリングして, コメントを追加して)',
      applyAiEdit: 'AIで編集を適用',
    },
    aiCommand: {
      title: 'AI Command Assistant',
      promptPlaceholder: 'やりたいことを自然言語で入力 (例: 直近のコミットを取り消したい, 8080番ポートを使っているプロセスを終了)',
      generate: '生成',
      dangerous: 'DANGEROUS',
      dangerousTooltip: '注意: 破壊的操作を含むコマンド',
      alternatives: '代替案:',
      footerTip: 'Enterでターミナルに挿入, Ctrl+Enterで即時実行, Escで閉じる',
      insertBtn: 'ターミナルに挿入',
      runBtn: '実行',
    },
    copilot: {
      title: 'Waddle Copilot',
      contextBadge: 'ターミナルコンテキスト',
      promptPlaceholder: 'Copilot に質問を入力... (例: jqコマンドの使い方, エラーの解説)',
      welcomeMessage:
        'こんにちは！Waddle AI アシスタントです。\nターミナルでの作業やトラブルシューティング、コマンドの生成など何でもご相談ください。\n\n例:\n- `カレントディレクトリ内の重複ファイルを探すコマンドは？`\n- `直前のエラー出力を解説して`\n- `このプロジェクトのビルド手順を教えて`',
      exportChat: 'チャット履歴をエクスポート',
      exportMarkdown: 'Markdown形式で保存 (.md)',
      exportJson: 'JSON形式で保存 (.json)',
    },
    errorBanner: {
      detected: (command) => `コマンド \`${command}\` でエラーが検出されました`,
      investigateBtn: 'AIで原因を調査 & 修正',
      details: '詳細',
      cause: '原因:',
      explanation: '解説:',
      fixCommand: '修正:',
      insertFix: '挿入',
      runFix: '修正を実行',
      analysisFailed: 'エラー解析に失敗しました',
      checkConnection: 'API設定またはネットワーク接続を確認してください。',
    },
    statusBar: {
      copyPathTooltip: 'クリックしてパスをコピー',
      gitRepoTooltip: 'Git リポジトリ',
      gitModified: '個の変更ファイル',
      gitUntracked: '個の未追跡ファイル',
      aiPromptTooltip: 'AI コマンド生成を開く (Ctrl+K)',
      aiSettingsTooltip: 'クリックしてAI設定を変更',
    },
    settings: {
      modalTitle: 'Waddle 設定 (Ollama Local AI & Appearance)',
      languageSectionTitle: 'Language / 言語',
      languageLabel: 'UI およびメッセージの表示言語',
      languages: {
        enUS: 'English (US)',
        enGB: 'English (UK / GB)',
        ja: '日本語 (Japanese)',
      },
      aiSectionTitle: 'ローカル AI エンジン (Ollama)',
      ollamaConnected: (ver, count) => `Ollama 接続完了 (v${ver || '0.x'}) - ${count}個のモデル利用可能`,
      ollamaDisconnected: 'Ollama 未起動または未接続',
      ollamaRefetch: 'モデル再取得',
      ollamaHint: '💡 Ollamaの起動方法: 別のターミナルで `ollama serve` を実行し、`ollama pull llama3.2` または `ollama pull deepseek-r1` を実行してください。',
      ollamaEndpointLabel: 'Ollama エンドポイント URL',
      ollamaRemoteWarning: '⚠️ セキュリティ警告: リモートのOllamaエンドポイントが設定されています。ターミナルログ、コマンド履歴、および編集コードがネットワーク経由で外部ホストに送信されます。信頼できるネットワーク環境かつHTTPS暗号化の使用を推奨します。',
      ollamaModelLabel: '使用するローカルモデル',
      temperatureLabel: (temp) => `生成 Temperature (${temp})`,
      terminalSectionTitle: 'ターミナル外観',
      themeLabel: 'カラーテーマ',
      fontLabel: 'フォント (Font Family)',
      customFontPlaceholder: "例: 'Hack', 'MesloLGS NF', monospace",
      fontSizeLabel: 'フォントサイズ (px)',
      cursorStyleLabel: 'カーソルスタイル',
      cursorBlock: 'Block',
      cursorUnderline: 'Underline',
      cursorBar: 'Bar',
      wallpaperLabel: '背景画像・壁紙 (Background Wallpaper)',
      wallpaperNone: 'なし (デフォルトダーク背景)',
      wallpaperOfficial: 'Waddle Official (公式壁紙)',
      wallpaperCustom: 'カスタム画像 (ファイル選択 / パス指定)...',
      wallpaperCustomPlaceholder: '例: /home/user/Pictures/wallpaper.jpg または https://...',
      wallpaperOpacityLabel: (percent) => `画像不透明度 (${percent}%)`,
      wallpaperBlurLabel: (px) => `背景ぼかし (${px}px)`,
      cancelBtn: 'キャンセル',
      saveBtn: '設定を保存',
      savedBtn: '保存完了！',
    },
    errorBoundary: {
      fallbackTitle: 'コンポーネントでエラーが発生しました',
      retry: '再試行',
    },
    security: {
      dangerousWarningTitle: '危険なコマンドを検出',
      dangerousWarningDesc:
        'このコマンドはファイルの完全削除、システム設定の変更、または動作中プロセスの強制終了を引き起こす可能性があります。',
      dangerousConfirmRun: 'リスクを理解した上で強制実行',
      dangerousSafeInsert: 'ターミナルへの挿入のみ（実行前に確認）',
    },
    terminal: {
      search: 'ターミナル内を検索',
      searchPlaceholder: '検索語句を入力 (Enter / Shift+Enter)...',
      matchCase: '大文字/小文字を区別',
      useRegex: '正規表現',
      prevMatch: '前の一致',
      nextMatch: '次の一致',
      closeSearch: '検索を閉じる (Esc)',
    },
  },
};

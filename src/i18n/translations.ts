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
    refreshAll: string;
    refreshAllTooltip: string;
    testPlan: string;
    testPlanTooltip: string;
    pipeline: string;
    pipelineTooltip: string;
    timeline: string;
    timelineTooltip: string;
    refreshModalTitle: string;
    refreshModalDesc: string;
    refreshModalBulletTabs: string;
    refreshModalBulletProcess: string;
    refreshModalBulletStorage: string;
    refreshModalBulletCwd: string;
    refreshModalWarning: string;
    refreshModalConfirm: string;
    refreshModalCancel: string;
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
    rename: string;
    renamePlaceholder: string;
    renameFailed: string;
    revealInFileManager: string;
    copyRelativePath: string;
    copyAbsolutePath: string;
    loadMore: (remaining: number) => string;
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
    readOnlyBadge: string;
    readOnlyTooltip: string;
    find: string;
    replace: string;
    replaceAll: string;
    findPlaceholder: string;
    replacePlaceholder: string;
    matchCase: string;
    previousMatch: string;
    nextMatch: string;
    closeSearch: string;
    noMatches: string;
    maxTabsExceeded: string;
    unsavedTitle: string;
    unsavedMessage: string;
    discardAndClose: string;
    recoveryTitle: string;
    recoveryMessage: string;
    restoreBackup: string;
    discardBackup: string;
    newTab: string;
    closeTab: string;
    secretsDetected: (count: number) => string;
    maskSecretsTooltip: string;
    unmaskSecretsTooltip: string;
    secretMaskOn: string;
    secretMaskOff: string;
    secretMaskProtected: string;
    secretMaskExposed: string;
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
    recentError: string;
    askFixBtn: string;
    askFixPrompt: (command: string, errSnippet: string) => string;
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
    gitAhead: (count: number) => string;
    gitBehind: (count: number) => string;
    gitConflicted: (count: number) => string;
    aiPromptTooltip: string;
    aiSettingsTooltip: string;
  };
  gitPopover: {
    title: string;
    branch: string;
    switchBranch: string;
    stagedChanges: string;
    unstagedChanges: string;
    untrackedFiles: string;
    noChanges: string;
    stageAll: string;
    unstageAll: string;
    commitMessagePlaceholder: string;
    commitBtn: string;
    committing: string;
    generateAiCommit: string;
    generatingAiCommit: string;
    discardConfirm: (file: string) => string;
    discardTooltip: string;
    viewDiffTooltip: string;
    stageTooltip: string;
    unstageTooltip: string;
    aheadBehind: (ahead: number, behind: number) => string;
    conflictedFiles: string;
    pull: string;
    pulling: string;
    pullTooltip: string;
    pullSuccess: string;
    push: string;
    pushing: string;
    pushTooltip: string;
    pushSuccess: string;
    authTipTitle: string;
    authTipDesc: string;
  };
  diffViewer: {
    title: (file: string) => string;
    stagedBadge: string;
    unstagedBadge: string;
    stageFile: string;
    unstageFile: string;
    discardFile: string;
    noDiff: string;
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
    neonThemesGroup: string;
    classicThemesGroup: string;
    neonBadge: string;
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
    gitSectionTitle: string;
    gitEnabledLabel: string;
    gitEnabledDesc: string;
    githubRestrictionLabel: string;
    githubRestrictionDesc: string;
    nonGithubRemoteWarning: (remote: string) => string;
    kittySectionTitle: string;
    kittyEnabledLabel: string;
    kittyEnabledDesc: string;
    kittyMaxDimensionLabel: string;
    kittyMaxDimensionDesc: string;
    kittyMaxPayloadLabel: string;
    kittyMaxPayloadDesc: string;
    kittyCacheLimitLabel: string;
    kittyCacheLimitDesc: string;
    kittyAllowedDirLabel: string;
    kittyAllowedDirDesc: string;
    kittyAllowedDirWarning: string;
    testPlanSectionTitle: string;
    testPlanCardTitle: string;
    testPlanCardDesc: string;
    testPlanBtn: string;
    editorSectionTitle: string;
    editorAutosaveLabel: string;
    editorAutosaveDesc: string;
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
      refreshAll: 'Refresh',
      refreshAllTooltip: 'Refresh workspace (tabs, panes, directory)',
      testPlan: 'Test Plan',
      testPlanTooltip: 'Open Comprehensive Test Verification Form',
      pipeline: 'Pipeline',
      pipelineTooltip: 'Visual Pipeline Builder (Ctrl+Shift+P)',
      timeline: 'Timeline',
      timelineTooltip: 'Session Command Timeline (Ctrl+Shift+H)',
      refreshModalTitle: 'Reset Entire Workspace?',
      refreshModalDesc: 'This will close all open tabs and split panes, terminate running processes, clear saved session state, and return to a fresh terminal in your home directory.',
      refreshModalBulletTabs: 'Close all tabs and split panes',
      refreshModalBulletProcess: 'Terminate active terminal processes',
      refreshModalBulletStorage: 'Clear saved session state',
      refreshModalBulletCwd: 'Reset working directory to home folder',
      refreshModalWarning: 'Unsaved command outputs or ongoing background tasks will be lost.',
      refreshModalConfirm: 'Refresh Workspace',
      refreshModalCancel: 'Cancel',
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
      rename: 'Rename',
      renamePlaceholder: 'New name...',
      renameFailed: 'Failed to rename: ',
      revealInFileManager: 'Reveal in File Manager',
      copyRelativePath: 'Copy Relative Path',
      copyAbsolutePath: 'Copy Absolute Path',
      loadMore: (remaining) => `Load more (${remaining} remaining)...`,
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
      readOnlyBadge: 'Read-Only',
      readOnlyTooltip: 'This file is opened in Read-Only mode',
      find: 'Find',
      replace: 'Replace',
      replaceAll: 'Replace All',
      findPlaceholder: 'Find (exact match)...',
      replacePlaceholder: 'Replace with...',
      matchCase: 'Match Case',
      previousMatch: 'Previous Match (Shift+Enter)',
      nextMatch: 'Next Match (Enter)',
      closeSearch: 'Close Search (Esc)',
      noMatches: 'No matches',
      maxTabsExceeded: 'You can only open up to 5 tabs. Please close unused tabs before opening more.',
      unsavedTitle: 'Unsaved Changes',
      unsavedMessage: 'There are unsaved changes. Discard and close?',
      discardAndClose: 'Discard and Close',
      recoveryTitle: 'Unsaved Backup Found',
      recoveryMessage: 'An unsaved backup from a previous session was found. Would you like to restore it?',
      restoreBackup: 'Restore',
      discardBackup: 'Discard',
      newTab: 'New File',
      closeTab: 'Close Tab',
      secretsDetected: (count: number) => `${count} secret${count > 1 ? 's' : ''} detected`,
      maskSecretsTooltip: 'Mask secrets with bullet overlay',
      unmaskSecretsTooltip: 'Reveal plain-text secrets',
      secretMaskOn: 'Mask ON',
      secretMaskOff: 'Mask OFF',
      secretMaskProtected: 'Protected with visual mask',
      secretMaskExposed: 'Plain-text exposed',
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
      recentError: 'Recent Error:',
      askFixBtn: 'Ask AI to Fix',
      askFixPrompt: (command: string, errSnippet: string) =>
        `The previous command \`${command}\` failed with the following error. Please explain the cause and provide the exact fix command:\n\n\`\`\`\n${errSnippet}\n\`\`\``,
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
      gitAhead: (count) => `${count} commit(s) ahead of remote`,
      gitBehind: (count) => `${count} commit(s) behind remote`,
      gitConflicted: (count) => `${count} merge conflict(s)`,
      aiPromptTooltip: 'Open AI Command Generator (Ctrl+K)',
      aiSettingsTooltip: 'Click to change AI settings',
    },
    gitPopover: {
      title: 'Git Status & Staging',
      branch: 'Branch',
      switchBranch: 'Switch branch...',
      stagedChanges: 'Staged Changes',
      unstagedChanges: 'Changes',
      untrackedFiles: 'Untracked Files',
      noChanges: 'Working tree clean, no changes',
      stageAll: 'Stage All',
      unstageAll: 'Unstage All',
      commitMessagePlaceholder: 'Commit message (e.g., feat: add new feature)...',
      commitBtn: 'Commit',
      committing: 'Committing...',
      generateAiCommit: 'AI Generate Conventional Commit',
      generatingAiCommit: 'AI generating commit message...',
      discardConfirm: (file) => `Discard all changes to "${file}"? This action cannot be undone.`,
      discardTooltip: 'Discard changes',
      viewDiffTooltip: 'View Diff',
      stageTooltip: 'Stage changes',
      unstageTooltip: 'Unstage changes',
      aheadBehind: (ahead, behind) => `${ahead} ahead, ${behind} behind remote`,
      conflictedFiles: 'Merge Conflicts',
      pull: 'Pull',
      pulling: 'Pulling...',
      pullTooltip: 'Pull latest changes from remote (git pull)',
      pullSuccess: 'Pull completed successfully',
      push: 'Push',
      pushing: 'Pushing...',
      pushTooltip: 'Push local commits to remote (git push)',
      pushSuccess: 'Push completed successfully',
      authTipTitle: 'GitHub Auth Tip',
      authTipDesc: 'Check that your SSH key (~/.ssh/id_ed25519) is configured on GitHub or run "gh auth login" in the terminal.',
    },
    diffViewer: {
      title: (file) => `Diff: ${file}`,
      stagedBadge: 'Staged (INDEX)',
      unstagedBadge: 'Working Tree',
      stageFile: 'Stage File',
      unstageFile: 'Unstage File',
      discardFile: 'Discard Changes',
      noDiff: 'No diff available or file is identical.',
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
      neonThemesGroup: '⚡ High-Voltage Neon Themes',
      classicThemesGroup: 'Classic & Pro Themes',
      neonBadge: '⚡ NEON',
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
      gitSectionTitle: 'Git & GitHub Integration',
      gitEnabledLabel: 'Enable Git Integration',
      gitEnabledDesc: 'Monitors local repository status, enables branch switching, staging, AI commit generator, and diff viewer. When disabled, git background processes are stopped.',
      githubRestrictionLabel: 'Restrict to GitHub Only (Policy)',
      githubRestrictionDesc: 'Strictly restricts Git remote connections to GitHub (github.com). Connections to non-GitHub remotes such as GitLab or custom servers are blocked to protect privacy.',
      nonGithubRemoteWarning: (remote) => `Non-GitHub remote detected (${remote}). Connections are restricted by security policy.`,
      kittySectionTitle: 'Kitty Graphics Protocol',
      kittyEnabledLabel: 'Enable Graphics Protocol',
      kittyEnabledDesc: 'Allows CLI and TUI tools (fastfetch, yazi, neovim image.nvim, etc.) to render inline graphics directly onto the canvas.',
      kittyMaxDimensionLabel: 'Max Image Dimension (px)',
      kittyMaxDimensionDesc: 'Protects against decompression bombs (1024 - 8192 px, default: 4096 px).',
      kittyMaxPayloadLabel: 'Max Payload Limit (MB)',
      kittyMaxPayloadDesc: 'Maximum cumulative Base64 transfer limit per image request (4 - 64 MB, default: 16 MB).',
      kittyCacheLimitLabel: 'Texture Cache Limit (MB)',
      kittyCacheLimitDesc: 'Maximum VRAM/RAM cache size managed via LRU eviction (64 - 1024 MB, default: 256 MB).',
      kittyAllowedDirLabel: 'Allowed Local Image Directory (Sandbox)',
      kittyAllowedDirDesc: 'Strict sandbox for local file references (t=f). Only files inside this path and subdirectories can be read (default: $HOME/Pictures).',
      kittyAllowedDirWarning: 'System-critical directory detected! File access outside safe sandbox paths will be blocked.',
      testPlanSectionTitle: 'Quality Assurance & Test Plan',
      testPlanCardTitle: 'Interactive Test Verification Form',
      testPlanCardDesc: 'Run, verify, and document all 81 automated and manual test cases covering PTY, splits, AI, Git, Kitty Graphics, and security controls.',
      testPlanBtn: 'Open Test Form',
      editorSectionTitle: 'Editor Settings',
      editorAutosaveLabel: 'Auto-backup (AutoSave)',
      editorAutosaveDesc: 'Automatically backup uncommitted changes to ~/.cache/waddle/autosave/ every 120 seconds',
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
      refreshAll: 'Refresh',
      refreshAllTooltip: 'Refresh workspace (tabs, panes, directory)',
      testPlan: 'Test Plan',
      testPlanTooltip: 'Open Comprehensive Test Verification Form',
      pipeline: 'Pipeline',
      pipelineTooltip: 'Visual Pipeline Builder (Ctrl+Shift+P)',
      timeline: 'Timeline',
      timelineTooltip: 'Session Command Timeline (Ctrl+Shift+H)',
      refreshModalTitle: 'Reset Entire Workspace?',
      refreshModalDesc: 'This will close all open tabs and split panes, terminate running processes, clear saved session state, and return to a fresh terminal in your home directory.',
      refreshModalBulletTabs: 'Close all tabs and split panes',
      refreshModalBulletProcess: 'Terminate active terminal processes',
      refreshModalBulletStorage: 'Clear saved session state',
      refreshModalBulletCwd: 'Reset working directory to home folder',
      refreshModalWarning: 'Unsaved command outputs or ongoing background tasks will be lost.',
      refreshModalConfirm: 'Refresh Workspace',
      refreshModalCancel: 'Cancel',
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
      rename: 'Rename',
      renamePlaceholder: 'New name...',
      renameFailed: 'Failed to rename: ',
      revealInFileManager: 'Reveal in File Manager',
      copyRelativePath: 'Copy Relative Path',
      copyAbsolutePath: 'Copy Absolute Path',
      loadMore: (remaining) => `Load more (${remaining} remaining)...`,
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
      readOnlyBadge: 'Read-Only',
      readOnlyTooltip: 'This file is opened in Read-Only mode',
      find: 'Find',
      replace: 'Replace',
      replaceAll: 'Replace All',
      findPlaceholder: 'Find (exact match)...',
      replacePlaceholder: 'Replace with...',
      matchCase: 'Match Case',
      previousMatch: 'Previous Match (Shift+Enter)',
      nextMatch: 'Next Match (Enter)',
      closeSearch: 'Close Search (Esc)',
      noMatches: 'No matches',
      maxTabsExceeded: 'You can only open up to 5 tabs. Please close unused tabs before opening more.',
      unsavedTitle: 'Unsaved Changes',
      unsavedMessage: 'There are unsaved changes. Discard and close?',
      discardAndClose: 'Discard and Close',
      recoveryTitle: 'Unsaved Backup Found',
      recoveryMessage: 'An unsaved backup from a previous session was found. Would you like to restore it?',
      restoreBackup: 'Restore',
      discardBackup: 'Discard',
      newTab: 'New File',
      closeTab: 'Close Tab',
      secretsDetected: (count: number) => `${count} secret${count > 1 ? 's' : ''} detected`,
      maskSecretsTooltip: 'Mask secrets with bullet overlay',
      unmaskSecretsTooltip: 'Reveal plain-text secrets',
      secretMaskOn: 'Mask ON',
      secretMaskOff: 'Mask OFF',
      secretMaskProtected: 'Protected with visual mask',
      secretMaskExposed: 'Plain-text exposed',
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
      recentError: 'Recent Error:',
      askFixBtn: 'Ask AI to Fix',
      askFixPrompt: (command: string, errSnippet: string) =>
        `The previous command \`${command}\` failed with the following error. Please explain the cause and provide the exact fix command:\n\n\`\`\`\n${errSnippet}\n\`\`\``,
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
      gitAhead: (count) => `${count} commit(s) ahead of remote`,
      gitBehind: (count) => `${count} commit(s) behind remote`,
      gitConflicted: (count) => `${count} merge conflict(s)`,
      aiPromptTooltip: 'Open AI Command Generator (Ctrl+K)',
      aiSettingsTooltip: 'Click to change AI settings',
    },
    gitPopover: {
      title: 'Git Status & Staging',
      branch: 'Branch',
      switchBranch: 'Switch branch...',
      stagedChanges: 'Staged Changes',
      unstagedChanges: 'Changes',
      untrackedFiles: 'Untracked Files',
      noChanges: 'Working tree clean, no changes',
      stageAll: 'Stage All',
      unstageAll: 'Unstage All',
      commitMessagePlaceholder: 'Commit message (e.g., feat: add new feature)...',
      commitBtn: 'Commit',
      committing: 'Committing...',
      generateAiCommit: 'AI Generate Conventional Commit',
      generatingAiCommit: 'AI generating commit message...',
      discardConfirm: (file) => `Discard all changes to "${file}"? This action cannot be undone.`,
      discardTooltip: 'Discard changes',
      viewDiffTooltip: 'View Diff',
      stageTooltip: 'Stage changes',
      unstageTooltip: 'Unstage changes',
      aheadBehind: (ahead, behind) => `${ahead} ahead, ${behind} behind remote`,
      conflictedFiles: 'Merge Conflicts',
      pull: 'Pull',
      pulling: 'Pulling...',
      pullTooltip: 'Pull latest changes from remote (git pull)',
      pullSuccess: 'Pull completed successfully',
      push: 'Push',
      pushing: 'Pushing...',
      pushTooltip: 'Push local commits to remote (git push)',
      pushSuccess: 'Push completed successfully',
      authTipTitle: 'GitHub Auth Tip',
      authTipDesc: 'Check that your SSH key (~/.ssh/id_ed25519) is configured on GitHub or run "gh auth login" in the terminal.',
    },
    diffViewer: {
      title: (file) => `Diff: ${file}`,
      stagedBadge: 'Staged (INDEX)',
      unstagedBadge: 'Working Tree',
      stageFile: 'Stage File',
      unstageFile: 'Unstage File',
      discardFile: 'Discard Changes',
      noDiff: 'No diff available or file is identical.',
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
      neonThemesGroup: '⚡ High-Voltage Neon Themes',
      classicThemesGroup: 'Classic & Pro Themes',
      neonBadge: '⚡ NEON',
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
      gitSectionTitle: 'Git & GitHub Integration',
      gitEnabledLabel: 'Enable Git Integration',
      gitEnabledDesc: 'Monitors local repository status, enables branch switching, staging, AI commit generator, and diff viewer. When disabled, git background processes are stopped.',
      githubRestrictionLabel: 'Restrict to GitHub Only (Policy)',
      githubRestrictionDesc: 'Strictly restricts Git remote connections to GitHub (github.com). Connections to non-GitHub remotes such as GitLab or custom servers are blocked to protect privacy.',
      nonGithubRemoteWarning: (remote) => `Non-GitHub remote detected (${remote}). Connections are restricted by security policy.`,
      kittySectionTitle: 'Kitty Graphics Protocol',
      kittyEnabledLabel: 'Enable Graphics Protocol',
      kittyEnabledDesc: 'Allows CLI and TUI tools (fastfetch, yazi, neovim image.nvim, etc.) to render inline graphics directly onto the canvas.',
      kittyMaxDimensionLabel: 'Max Image Dimension (px)',
      kittyMaxDimensionDesc: 'Protects against decompression bombs (1024 - 8192 px, default: 4096 px).',
      kittyMaxPayloadLabel: 'Max Payload Limit (MB)',
      kittyMaxPayloadDesc: 'Maximum cumulative Base64 transfer limit per image request (4 - 64 MB, default: 16 MB).',
      kittyCacheLimitLabel: 'Texture Cache Limit (MB)',
      kittyCacheLimitDesc: 'Maximum VRAM/RAM cache size managed via LRU eviction (64 - 1024 MB, default: 256 MB).',
      kittyAllowedDirLabel: 'Allowed Local Image Directory (Sandbox)',
      kittyAllowedDirDesc: 'Strict sandbox for local file references (t=f). Only files inside this path and subdirectories can be read (default: $HOME/Pictures).',
      kittyAllowedDirWarning: 'System-critical directory detected! File access outside safe sandbox paths will be blocked.',
      testPlanSectionTitle: 'Quality Assurance & Test Plan',
      testPlanCardTitle: 'Interactive Test Verification Form',
      testPlanCardDesc: 'Run, verify, and document all 81 automated and manual test cases covering PTY, splits, AI, Git, Kitty Graphics, and security controls.',
      testPlanBtn: 'Open Test Form',
      editorSectionTitle: 'Editor Settings',
      editorAutosaveLabel: 'Auto-backup (AutoSave)',
      editorAutosaveDesc: 'Automatically backup uncommitted changes to ~/.cache/waddle/autosave/ every 120 seconds',
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
      refreshAll: 'リフレッシュ',
      refreshAllTooltip: '全タブ・ペイン・作業ディレクトリを初期状態にリフレッシュ',
      testPlan: 'テスト検証',
      testPlanTooltip: '包括的検証テスト入力フォームを開く',
      pipeline: 'パイプ',
      pipelineTooltip: 'パイプライン ビルダー (Ctrl+Shift+P)',
      timeline: '履歴',
      timelineTooltip: 'セッション タイムライン (Ctrl+Shift+H)',
      refreshModalTitle: 'ワークスペース全体をリフレッシュしますか？',
      refreshModalDesc: '開いているすべてのタブと分割ペインを閉じ、実行中のプロセスを終了して、セッション保存状態をクリアし、ホームディレクトリの新規単一ターミナルに戻します。',
      refreshModalBulletTabs: 'すべてのタブと分割ペインを閉じる',
      refreshModalBulletProcess: '実行中のターミナルプロセスを終了',
      refreshModalBulletStorage: 'セッション保存状態をクリア',
      refreshModalBulletCwd: '作業ディレクトリを初期ホームディレクトリにリセット',
      refreshModalWarning: '未保存の作業内容や実行中のバックグラウンドタスクは失われます。',
      refreshModalConfirm: 'すべてリフレッシュ',
      refreshModalCancel: 'キャンセル',
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
      rename: '名前の変更',
      renamePlaceholder: '新しい名前...',
      renameFailed: '名前の変更に失敗しました: ',
      revealInFileManager: 'ファイルマネージャーで表示',
      copyRelativePath: '相対パスをコピー',
      copyAbsolutePath: '絶対パスをコピー',
      loadMore: (remaining) => `さらに読み込む (残り ${remaining} 件)...`,
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
      readOnlyBadge: 'Read-Only',
      readOnlyTooltip: 'このファイルは閲覧専用（Read-Only）です',
      find: '検索',
      replace: '置換',
      replaceAll: 'すべて置換',
      findPlaceholder: '完全一致検索...',
      replacePlaceholder: '置換後の文字列...',
      matchCase: '大文字/小文字を区別',
      previousMatch: '前の一致 (Shift+Enter)',
      nextMatch: '次の一致 (Enter)',
      closeSearch: '検索バーを閉じる (Esc)',
      noMatches: '一致なし',
      maxTabsExceeded: '一度に開けるタブは最大 5 件までです。不要なタブを閉じてから再度お試しください。',
      unsavedTitle: '未保存の変更',
      unsavedMessage: '保存されていない変更があります。破棄して閉じますか？',
      discardAndClose: '破棄して閉じる',
      recoveryTitle: 'リカバリ検知',
      recoveryMessage: '前回の未保存バックアップデータが見つかりました。復元しますか？',
      restoreBackup: '復元する',
      discardBackup: '破棄する',
      newTab: '新規ファイル',
      closeTab: 'タブを閉じる',
      secretsDetected: (count: number) => `${count} 件のシークレットを検知`,
      maskSecretsTooltip: 'シークレットを伏字マスク',
      unmaskSecretsTooltip: 'シークレットを平文表示',
      secretMaskOn: 'マスク ON',
      secretMaskOff: 'マスク OFF',
      secretMaskProtected: '伏字で保護中',
      secretMaskExposed: '平文表示中・漏洩注意',
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
      recentError: '直前のエラー:',
      askFixBtn: 'エラー修正を質問',
      askFixPrompt: (command: string, errSnippet: string) =>
        `直前のコマンド \`${command}\` で以下のエラーが発生しました。原因と具体的な修正コマンドを教えてください:\n\n\`\`\`\n${errSnippet}\n\`\`\``,
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
      gitAhead: (count) => `リモートより${count}コミット先行`,
      gitBehind: (count) => `リモートより${count}コミット遅延`,
      gitConflicted: (count) => `${count}件の競合 (マージコンフリクト)`,
      aiPromptTooltip: 'AI コマンド生成を開く (Ctrl+K)',
      aiSettingsTooltip: 'クリックしてAI設定を変更',
    },
    gitPopover: {
      title: 'Git ステータス & ステージング',
      branch: 'ブランチ',
      switchBranch: 'ブランチを切り替え...',
      stagedChanges: 'ステージされた変更',
      unstagedChanges: '変更されたファイル',
      untrackedFiles: '追跡対象外のファイル',
      noChanges: '変更はありません (クリーンな作業ツリー)',
      stageAll: 'すべてステージ',
      unstageAll: 'すべてのステージを解除',
      commitMessagePlaceholder: 'コミットメッセージを入力 (例: feat: 機能を追加)...',
      commitBtn: 'コミット',
      committing: 'コミット中...',
      generateAiCommit: 'AI Conventional Commit 自動生成',
      generatingAiCommit: 'AIがコミットメッセージを生成中...',
      discardConfirm: (file) => `"${file}" の変更を破棄しますか？この操作は取り消せません。`,
      discardTooltip: '変更を破棄',
      viewDiffTooltip: '差分を表示 (Diff)',
      stageTooltip: 'ステージに追加',
      unstageTooltip: 'ステージから除外',
      aheadBehind: (ahead, behind) => `リモート: ↑${ahead}先行 / ↓${behind}遅延`,
      conflictedFiles: 'マージの競合',
      pull: 'Pull',
      pulling: 'Pull中...',
      pullTooltip: 'リモートから最新の変更を取り込む (git pull)',
      pullSuccess: 'Pullが正常に完了しました',
      push: 'Push',
      pushing: 'Push中...',
      pushTooltip: 'コミットをリモートへ送信 (git push)',
      pushSuccess: 'Pushが正常に完了しました',
      authTipTitle: 'GitHub認証のヒント',
      authTipDesc: 'SSH秘密鍵 (~/.ssh/id_ed25519) がGitHubアカウントに登録されているか、またはターミナルで「gh auth login」を実行して認証されているか確認してください。',
    },
    diffViewer: {
      title: (file) => `差分: ${file}`,
      stagedBadge: 'ステージ済み (INDEX)',
      unstagedBadge: 'ワーキングツリー',
      stageFile: 'ステージに追加',
      unstageFile: 'ステージから除外',
      discardFile: '変更を破棄',
      noDiff: '差分はありません、またはファイルの内容は一致しています。',
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
      neonThemesGroup: '⚡ 高電圧ネオン・ハデハデテーマ',
      classicThemesGroup: 'スタンダード・プロテーマ',
      neonBadge: '⚡ NEON',
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
      gitSectionTitle: 'Git & GitHub 連携設定',
      gitEnabledLabel: 'Git 連携機能の有効化',
      gitEnabledDesc: 'ローカル Git リポジトリのステータス監視、ブランチ切替、ステージング、AI コミット生成、Diff ビューワーを有効にします。無効にすると Git 監視プロセスを完全停止し、純粋なターミナルとして動作します。',
      githubRestrictionLabel: 'GitHub 接続限定ポリシー (推奨)',
      githubRestrictionDesc: 'ローカル完結・GitHub特化ポリシーに基づき、Gitリモート接続先を GitHub (github.com) のみに限定します。GitLab や外部独自サーバー等の他サイトへの接続を遮断し、機密情報の流出を防止します。',
      nonGithubRemoteWarning: (remote) => `非GitHubリモートが検出されました (${remote})。セキュリティポリシーにより外部接続が遮断されています。`,
      kittySectionTitle: 'Kitty 画像プロトコル (Kitty Graphics)',
      kittyEnabledLabel: 'Kitty 画像描画プロトコルの有効化',
      kittyEnabledDesc: 'fastfetch, yazi, neovim (image.nvim) などの CLI/TUI ツールからターミナル Canvas へのインライン画像描画・操作を許可します。',
      kittyMaxDimensionLabel: '最大画像寸法 (px)',
      kittyMaxDimensionDesc: '展開爆弾（Decompression Bomb）を防御する上限寸法 (1024〜8192 px, 初期値: 4096 px)。超過画像はデコード前に破棄されます。',
      kittyMaxPayloadLabel: '最大ペイロードサイズ (MB)',
      kittyMaxPayloadDesc: '単一リクエストあたりの累積 Base64 転送サイズ上限 (4〜64 MB, 初期値: 16 MB)。',
      kittyCacheLimitLabel: 'テクスチャキャッシュ総枠 (MB)',
      kittyCacheLimitDesc: 'LRU 方式で管理される GPU/VRAM キャッシュ上限枠 (64〜1024 MB, 初期値: 256 MB)。超過時は古い画像から確実に破棄・解放されます。',
      kittyAllowedDirLabel: 'ローカル画像読み取り許可ディレクトリ (Sandbox)',
      kittyAllowedDirDesc: 'ローカルファイル直接参照 (t=f) に対する厳格なサンドボックスです。このパス配下のファイルのみ参照可能（初期値: $HOME/Pictures）。../ 脱出やシンボリックリンク経由の脱出は遮断されます。',
      kittyAllowedDirWarning: 'システム重要ディレクトリが指定されています。セキュリティ保護のためサンドボックス外へのアクセスは遮断されます。',
      testPlanSectionTitle: '品質検証・テスト計画 (QA & Testing)',
      testPlanCardTitle: '包括的検証テスト入力フォーム',
      testPlanCardDesc: 'PTY基盤、画面分割、AI、Git、Kitty画像プロトコル、セキュリティ多層防御など全81項目のテストケースの合否判定とエビデンス記録・レポート出力を行えます。',
      testPlanBtn: 'テスト入力フォームを開く',
      editorSectionTitle: 'エディタ設定',
      editorAutosaveLabel: 'エディタの自動バックアップ（AutoSave）',
      editorAutosaveDesc: '未保存の変更を 120 秒ごとに ~/.cache/waddle/autosave/ へ自動退避します',
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

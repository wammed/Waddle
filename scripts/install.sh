#!/usr/bin/env bash
# ==============================================================================
# Waddle - Local Desktop & COSMIC Launcher Installation Script
# Installs binary to $HOME/.local/bin and desktop/icon assets for COSMIC Launcher.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🐧⚡ [Waddle Installer] Setting up Waddle for Linux / COSMIC Desktop...${NC}"

# Parse optional arguments
FORCE_BUILD=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --build|-b)
            FORCE_BUILD=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --build, -b    Force re-compilation of release binary before installation"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $1${NC}"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

USER_HOME="${HOME:-$(getent passwd "$(whoami)" | cut -d: -f6)}"
BIN_DIR="$USER_HOME/.local/bin"
APPLICATIONS_DIR="$USER_HOME/.local/share/applications"
ICONS_BASE="$USER_HOME/.local/share/icons/hicolor"
RELEASE_BIN="$ROOT_DIR/src-tauri/target/release/waddle"

# ------------------------------------------------------------------------------
# 1. Build or Locate Release Binary
# ------------------------------------------------------------------------------
if [[ "$FORCE_BUILD" == true ]] || [[ ! -f "$RELEASE_BIN" ]]; then
    echo -e "${BLUE}🔨 Building release binary (frontend & Rust)...${NC}"
    cd "$ROOT_DIR"
    if [[ ! -d "$ROOT_DIR/dist" ]]; then
        npm run build
    fi
    cargo build --release --manifest-path "$ROOT_DIR/src-tauri/Cargo.toml"
fi

if [[ ! -f "$RELEASE_BIN" ]]; then
    echo -e "${RED}❌ Error: Release binary not found at ${RELEASE_BIN}${NC}" >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. Install Binary to $HOME/.local/bin/waddle
# ------------------------------------------------------------------------------
echo -e "${BLUE}📦 Installing binary to ${BIN_DIR}/waddle...${NC}"
mkdir -p "$BIN_DIR"
install -Dm755 "$RELEASE_BIN" "$BIN_DIR/waddle"
echo -e "${GREEN}✓ Binary installed: ${BIN_DIR}/waddle${NC}"

# ------------------------------------------------------------------------------
# 3. Generate and Install Desktop Icons
# ------------------------------------------------------------------------------
echo -e "${BLUE}🎨 Installing application icons into ${ICONS_BASE}...${NC}"

# If generate_icons.py is present and python3 is available, run it to ensure full sync
if [[ -f "$ROOT_DIR/generate_icons.py" ]] && command -v python3 &>/dev/null; then
    python3 "$ROOT_DIR/generate_icons.py" > /dev/null 2>&1 || true
fi

# Ensure scalable SVG icons
mkdir -p "$ICONS_BASE/scalable/apps"
if [[ -f "$ROOT_DIR/images/waddle-icon.svg" ]]; then
    install -Dm644 "$ROOT_DIR/images/waddle-icon.svg" "$ICONS_BASE/scalable/apps/waddle.svg"
    install -Dm644 "$ROOT_DIR/images/waddle-icon.svg" "$ICONS_BASE/scalable/apps/com.waddle.terminal.svg"
fi

# Ensure raster PNG icons for standard desktop launcher resolutions
declare -A ICON_SIZES=(
    ["512x512"]="512"
    ["256x256"]="256"
    ["128x128"]="128"
    ["64x64"]="64"
    ["48x48"]="48"
    ["32x32"]="32"
    ["16x16"]="16"
)

TAURI_ICONS="$ROOT_DIR/src-tauri/icons"
for RES in "${!ICON_SIZES[@]}"; do
    mkdir -p "$ICONS_BASE/${RES}/apps"
done

# Copy from generated icons or tauri icon bundle
[[ -f "$TAURI_ICONS/icon.png" ]] && install -Dm644 "$TAURI_ICONS/icon.png" "$ICONS_BASE/512x512/apps/waddle.png"
[[ -f "$TAURI_ICONS/icon.png" ]] && install -Dm644 "$TAURI_ICONS/icon.png" "$ICONS_BASE/512x512/apps/com.waddle.terminal.png"
[[ -f "$TAURI_ICONS/128x128@2x.png" ]] && install -Dm644 "$TAURI_ICONS/128x128@2x.png" "$ICONS_BASE/256x256/apps/waddle.png"
[[ -f "$TAURI_ICONS/128x128@2x.png" ]] && install -Dm644 "$TAURI_ICONS/128x128@2x.png" "$ICONS_BASE/256x256/apps/com.waddle.terminal.png"
[[ -f "$TAURI_ICONS/128x128.png" ]] && install -Dm644 "$TAURI_ICONS/128x128.png" "$ICONS_BASE/128x128/apps/waddle.png"
[[ -f "$TAURI_ICONS/128x128.png" ]] && install -Dm644 "$TAURI_ICONS/128x128.png" "$ICONS_BASE/128x128/apps/com.waddle.terminal.png"
[[ -f "$TAURI_ICONS/64x64.png" ]] && install -Dm644 "$TAURI_ICONS/64x64.png" "$ICONS_BASE/64x64/apps/waddle.png"
[[ -f "$TAURI_ICONS/64x64.png" ]] && install -Dm644 "$TAURI_ICONS/64x64.png" "$ICONS_BASE/64x64/apps/com.waddle.terminal.png"
[[ -f "$TAURI_ICONS/32x32.png" ]] && install -Dm644 "$TAURI_ICONS/32x32.png" "$ICONS_BASE/32x32/apps/waddle.png"
[[ -f "$TAURI_ICONS/32x32.png" ]] && install -Dm644 "$TAURI_ICONS/32x32.png" "$ICONS_BASE/32x32/apps/com.waddle.terminal.png"

echo -e "${GREEN}✓ Icons installed into ${ICONS_BASE}${NC}"

# ------------------------------------------------------------------------------
# 4. Create Desktop Entry for COSMIC Launcher
# ------------------------------------------------------------------------------
echo -e "${BLUE}🚀 Configuring desktop entry for COSMIC Launcher...${NC}"
mkdir -p "$APPLICATIONS_DIR"

DESKTOP_ENTRY_CONTENT="[Desktop Entry]
Name=Waddle
GenericName=AI Terminal Emulator
Comment=AI-Integrated Next-Generation Linux Terminal Emulator
Exec=${BIN_DIR}/waddle %U
Icon=waddle
Terminal=false
Type=Application
Categories=System;TerminalEmulator;Development;Utility;
Keywords=terminal;shell;prompt;command;ai;ollama;xterm;cosmic;
StartupWMClass=waddle
"

echo "$DESKTOP_ENTRY_CONTENT" > "$APPLICATIONS_DIR/waddle.desktop"
chmod 644 "$APPLICATIONS_DIR/waddle.desktop"

# Also create com.waddle.terminal.desktop for Wayland / COSMIC app-id matching
echo "$DESKTOP_ENTRY_CONTENT" > "$APPLICATIONS_DIR/com.waddle.terminal.desktop"
chmod 644 "$APPLICATIONS_DIR/com.waddle.terminal.desktop"

# Update timestamp to trigger desktop environment file watchers
touch "$APPLICATIONS_DIR/waddle.desktop" "$APPLICATIONS_DIR/com.waddle.terminal.desktop"
echo -e "${GREEN}✓ Desktop entries created in ${APPLICATIONS_DIR}${NC}"

# ------------------------------------------------------------------------------
# 5. Rebuild Caches (GTK Icon Cache & Desktop Database)
# ------------------------------------------------------------------------------
echo -e "${BLUE}🔄 Refreshing system caches...${NC}"

if command -v update-desktop-database &>/dev/null; then
    update-desktop-database "$APPLICATIONS_DIR" >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ Desktop database updated${NC}"
fi

if command -v gtk-update-icon-cache &>/dev/null; then
    gtk-update-icon-cache -f -t "$ICONS_BASE" >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ GTK icon cache updated${NC}"
fi

if command -v gtk4-update-icon-cache &>/dev/null; then
    gtk4-update-icon-cache -f -t "$ICONS_BASE" >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ GTK4 icon cache updated${NC}"
fi

# ------------------------------------------------------------------------------
# 6. Verification & Path Notice
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}🎉 Waddle has been successfully installed!${NC}"
echo -e "   - Executable:       ${CYAN}${BIN_DIR}/waddle${NC}"
echo -e "   - Desktop Entry:    ${CYAN}${APPLICATIONS_DIR}/waddle.desktop${NC}"
echo -e "   - Launcher Icons:   ${CYAN}${ICONS_BASE}/scalable/apps/waddle.svg${NC}"
echo ""

# Check if PATH contains ~/.local/bin
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo -e "${YELLOW}⚠️  Notice: ${BIN_DIR} is not in your current PATH.${NC}"
    echo -e "   To run 'waddle' directly from any terminal, add this to your shell config (~/.bashrc, ~/.zshrc, or ~/.config/fish/config.fish):"
    echo -e "   ${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
    echo ""
fi

echo -e "You can now launch ${CYAN}Waddle${NC} from the ${CYAN}COSMIC Launcher (Super key)${NC} or Application Library."


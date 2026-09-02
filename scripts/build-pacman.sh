#!/usr/bin/env bash
# ==============================================================================
# Waddle - Arch Linux Pacman Package (.pkg.tar.zst) Builder
# Builds a native pacman package compatible with Arch Linux, CachyOS, Manjaro, etc.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🐧⚡ [Waddle Pacman Builder] Starting build for Arch Linux..."

# 1. Version Detection
VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$ROOT_DIR/src-tauri/tauri.conf.json')).version)" 2>/dev/null || echo "0.1.0")
PKGREL="1"
ARCH="x86_64"
PKGNAME="waddle"

echo "📌 Package: ${PKGNAME} v${VERSION}-${PKGREL} (${ARCH})"

# 2. Build Release Binary using Tauri (without AppImage/deb/rpm bundles)
cd "$ROOT_DIR"
echo "🔨 Compiling frontend & Rust binary in release mode (no-bundle)..."
npx tauri build --no-bundle

BINARY_PATH="$ROOT_DIR/src-tauri/target/release/waddle"
if [[ ! -f "$BINARY_PATH" ]]; then
    echo "❌ Error: Compiled binary not found at $BINARY_PATH" >&2
    exit 1
fi

# 3. Setup Staging Directory
BUNDLE_PACMAN_DIR="$ROOT_DIR/src-tauri/target/release/bundle/pacman"
PKG_DIR="$BUNDLE_PACMAN_DIR/pkg"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/usr/bin"
mkdir -p "$PKG_DIR/usr/share/applications"
mkdir -p "$PKG_DIR/usr/share/icons/hicolor/32x32/apps"
mkdir -p "$PKG_DIR/usr/share/icons/hicolor/128x128/apps"
mkdir -p "$PKG_DIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$PKG_DIR/usr/share/icons/hicolor/scalable/apps"

echo "📂 Staging application files..."

# Copy executable
cp "$BINARY_PATH" "$PKG_DIR/usr/bin/waddle"
chmod 755 "$PKG_DIR/usr/bin/waddle"

# Install Desktop Entry
cat << 'EOF' > "$PKG_DIR/usr/share/applications/waddle.desktop"
[Desktop Entry]
Name=Waddle
GenericName=AI Terminal Emulator
Comment=AI-Integrated Next-Generation Linux Terminal Emulator
Exec=waddle %U
Icon=waddle
Terminal=false
Type=Application
Categories=System;TerminalEmulator;Development;Utility;
Keywords=terminal;shell;prompt;command;ai;ollama;xterm;
StartupWMClass=waddle
EOF
chmod 644 "$PKG_DIR/usr/share/applications/waddle.desktop"

# Copy Icons
ICONS_SRC="$ROOT_DIR/src-tauri/icons"
if [[ -f "$ICONS_SRC/32x32.png" ]]; then
    cp "$ICONS_SRC/32x32.png" "$PKG_DIR/usr/share/icons/hicolor/32x32/apps/waddle.png"
fi
if [[ -f "$ICONS_SRC/128x128.png" ]]; then
    cp "$ICONS_SRC/128x128.png" "$PKG_DIR/usr/share/icons/hicolor/128x128/apps/waddle.png"
fi
if [[ -f "$ICONS_SRC/128x128@2x.png" ]]; then
    cp "$ICONS_SRC/128x128@2x.png" "$PKG_DIR/usr/share/icons/hicolor/256x256/apps/waddle.png"
fi
if [[ -f "$ROOT_DIR/public/waddle-icon.svg" ]]; then
    cp "$ROOT_DIR/public/waddle-icon.svg" "$PKG_DIR/usr/share/icons/hicolor/scalable/apps/waddle.svg"
fi

# 4. Calculate Installed Size in Bytes
INSTALLED_SIZE=$(du -sb "$PKG_DIR/usr" | awk '{print $1}')
BUILD_DATE=$(date +%s)

# 5. Generate .PKGINFO
cat << EOF > "$PKG_DIR/.PKGINFO"
pkgname = ${PKGNAME}
pkgbase = ${PKGNAME}
pkgver = ${VERSION}-${PKGREL}
pkgdesc = AI-Integrated Next-Generation Linux Terminal Emulator
url = https://github.com/wammed/Waddle
builddate = ${BUILD_DATE}
packager = Waddle Build System
size = ${INSTALLED_SIZE}
arch = ${ARCH}
license = MIT
depend = gtk3
depend = webkit2gtk-4.1
depend = zenity
depend = hicolor-icon-theme
optdepend = ollama: Local AI engine for command generation and chat
provides = waddle
conflict = waddle-git
conflict = waddle-bin
EOF

# 6. Compress with bsdtar and zstd into .pkg.tar.zst
OUT_FILENAME="${PKGNAME}-${VERSION}-${PKGREL}-${ARCH}.pkg.tar.zst"
FINAL_PKG="$BUNDLE_PACMAN_DIR/$OUT_FILENAME"

echo "📦 Creating Pacman package archive (.pkg.tar.zst)..."
cd "$PKG_DIR"
bsdtar --uid 0 --gid 0 -cf - .PKGINFO usr | zstd -c -T0 --ultra -20 - > "$FINAL_PKG"

# Clean temporary staging directory
rm -rf "$PKG_DIR"

# 7. Validate with pacman
echo "🔍 Validating package with pacman..."
pacman -Qip "$FINAL_PKG"

PKG_SIZE=$(ls -lh "$FINAL_PKG" | awk '{print $5}')
echo ""
echo "=============================================================================="
echo "🎉 [Success] Arch Linux Pacman package created successfully!"
echo "📍 Location: $FINAL_PKG ($PKG_SIZE)"
echo "🚀 To install on Arch Linux / CachyOS / Manjaro:"
echo "   sudo pacman -U $FINAL_PKG"
echo "=============================================================================="

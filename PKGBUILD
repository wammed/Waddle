# Maintainer: Susie <susie@localhost>
pkgname=waddle
pkgver=0.1.0
pkgrel=1
pkgdesc="AI-Integrated Next-Generation Linux Terminal Emulator"
arch=('x86_64')
url="https://github.com/wammed/Waddle"
license=('MIT')
depends=('gtk3' 'webkit2gtk-4.1' 'zenity' 'hicolor-icon-theme')
optdepends=('ollama: Local AI engine for command generation and chat')
provides=('waddle')
conflicts=('waddle-bin' 'waddle-git')

build() {
    cd "${srcdir}/.."
    npm run build
    npx tauri build --no-bundle
}

package() {
    cd "${srcdir}/.."
    install -Dm755 "src-tauri/target/release/waddle" "${pkgdir}/usr/bin/waddle"
    
    # Desktop Entry
    install -dm755 "${pkgdir}/usr/share/applications"
    cat << 'EOF' > "${pkgdir}/usr/share/applications/waddle.desktop"
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
    chmod 644 "${pkgdir}/usr/share/applications/waddle.desktop"

    # Icons
    install -Dm644 "src-tauri/icons/32x32.png" "${pkgdir}/usr/share/icons/hicolor/32x32/apps/waddle.png"
    install -Dm644 "src-tauri/icons/128x128.png" "${pkgdir}/usr/share/icons/hicolor/128x128/apps/waddle.png"
    install -Dm644 "src-tauri/icons/128x128@2x.png" "${pkgdir}/usr/share/icons/hicolor/256x256/apps/waddle.png"
    if [[ -f "public/waddle-icon.svg" ]]; then
        install -Dm644 "public/waddle-icon.svg" "${pkgdir}/usr/share/icons/hicolor/scalable/apps/waddle.svg"
    fi
}

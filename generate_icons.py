import base64
import os
import re
import shutil
import subprocess
from PIL import Image

def generate_icons():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    src_svg = os.path.join(root_dir, "images/waddle-icon.svg")

    if not os.path.exists(src_svg):
        print(f"Error: {src_svg} not found")
        return

    print(f"Reading source icon: {src_svg}")

    # Copy SVG to public and src/assets
    svg_targets = [
        os.path.join(root_dir, "public/waddle-icon.svg"),
        os.path.join(root_dir, "src/assets/waddle-icon.svg"),
    ]
    for target in svg_targets:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(src_svg, target)
        print(f"Updated SVG: {target}")

    # Extract or render high-resolution raster image
    with open(src_svg, "r", encoding="utf-8") as f:
        svg_content = f.read()

    m = re.search(r"base64,([A-Za-z0-9+/=\s]+)", svg_content)
    if m:
        clean_b64 = re.sub(r"\s+", "", m.group(1))
        raw_png = base64.b64decode(clean_b64)
        from io import BytesIO
        src_img = Image.open(BytesIO(raw_png)).convert("RGBA")
    else:
        # Fallback to rsvg-convert if not an embedded base64 png
        temp_png = os.path.join(root_dir, "scratch/temp_rendered.png")
        os.makedirs(os.path.dirname(temp_png), exist_ok=True)
        subprocess.run(["rsvg-convert", src_svg, "-o", temp_png], check=True)
        src_img = Image.open(temp_png).convert("RGBA")

    w, h = src_img.size
    print(f"Source image dimensions: {w}x{h}, Mode: {src_img.mode}")

    # Create 512x512 square icon maintaining aspect ratio with transparency
    canvas_size = 512
    scale = canvas_size / max(w, h)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    resized = src_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    app_icon_512 = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    paste_x = (canvas_size - new_w) // 2
    paste_y = (canvas_size - new_h) // 2
    app_icon_512.paste(resized, (paste_x, paste_y), resized)

    # Save primary 512x512 icons
    out_512_paths = [
        os.path.join(root_dir, "images/waddle-icon.png"),
        os.path.join(root_dir, "public/waddle-icon.png"),
        os.path.join(root_dir, "src/assets/waddle-icon.png"),
        os.path.join(root_dir, "src-tauri/icons/icon.png"),
    ]
    for p in out_512_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        app_icon_512.save(p, "PNG")
        print(f"Saved 512x512 icon: {p}")

    # Use tauri icon command to generate all platform bundle icons
    icon_source = os.path.join(root_dir, "images/waddle-icon.png")
    print(f"Running 'npx tauri icon {icon_source}'...")
    subprocess.run(["npx", "tauri", "icon", icon_source], cwd=root_dir, check=True)

    # Update Linux Desktop / User local icon cache (~/.local/share/icons/hicolor)
    user_home = os.path.expanduser("~")
    local_icons_base = os.path.join(user_home, ".local/share/icons/hicolor")

    desktop_icon_mappings = [
        # Scalable SVGs
        (src_svg, os.path.join(local_icons_base, "scalable/apps/waddle.svg"), "copy"),
        (src_svg, os.path.join(local_icons_base, "scalable/apps/com.waddle.terminal.svg"), "copy"),
        # 512x512 PNGs
        (512, os.path.join(local_icons_base, "512x512/apps/waddle.png")),
        (512, os.path.join(local_icons_base, "512x512/apps/com.waddle.terminal.png")),
        # 256x256 PNGs
        (256, os.path.join(local_icons_base, "256x256/apps/waddle.png")),
        (256, os.path.join(local_icons_base, "256x256/apps/waddle-256x256.png")),
        (256, os.path.join(local_icons_base, "256x256/apps/com.waddle.terminal.png")),
        # 128x128 PNGs
        (128, os.path.join(local_icons_base, "128x128/apps/waddle.png")),
        (128, os.path.join(local_icons_base, "128x128/apps/waddle-128x128.png")),
        (128, os.path.join(local_icons_base, "128x128/apps/com.waddle.terminal.png")),
        # 64x64 PNGs
        (64, os.path.join(local_icons_base, "64x64/apps/waddle.png")),
        (64, os.path.join(local_icons_base, "64x64/apps/com.waddle.terminal.png")),
        # 48x48 PNGs
        (48, os.path.join(local_icons_base, "48x48/apps/waddle.png")),
        (48, os.path.join(local_icons_base, "48x48/apps/com.waddle.terminal.png")),
        # 32x32 PNGs
        (32, os.path.join(local_icons_base, "32x32/apps/waddle.png")),
        (32, os.path.join(local_icons_base, "32x32/apps/com.waddle.terminal.png")),
        # 16x16 PNGs
        (16, os.path.join(local_icons_base, "16x16/apps/waddle.png")),
        (16, os.path.join(local_icons_base, "16x16/apps/com.waddle.terminal.png")),
    ]

    for item in desktop_icon_mappings:
        if len(item) == 3 and item[2] == "copy":
            src_f, dest_f, _ = item
            os.makedirs(os.path.dirname(dest_f), exist_ok=True)
            shutil.copyfile(src_f, dest_f)
            print(f"Updated local desktop icon: {dest_f}")
        else:
            sz, dest_f = item
            os.makedirs(os.path.dirname(dest_f), exist_ok=True)
            resized_icon = app_icon_512.resize((sz, sz), Image.Resampling.LANCZOS)
            resized_icon.save(dest_f, "PNG")
            print(f"Updated local desktop icon: {dest_f} ({sz}x{sz})")

    # Update Desktop Entries (~/.local/share/applications)
    local_apps_dir = os.path.join(user_home, ".local/share/applications")
    os.makedirs(local_apps_dir, exist_ok=True)
    desktop_content = """[Desktop Entry]
Name=Waddle
GenericName=AI Terminal Emulator
Comment=AI-Integrated Next-Generation Linux Terminal Emulator
Exec=/home/susie/.local/bin/waddle %U
Icon=waddle
Terminal=false
Type=Application
Categories=System;TerminalEmulator;Development;Utility;
Keywords=terminal;shell;prompt;command;ai;ollama;xterm;
StartupWMClass=waddle
"""
    desktop_files = [
        os.path.join(local_apps_dir, "waddle.desktop"),
        os.path.join(local_apps_dir, "com.waddle.terminal.desktop"),
    ]
    for df in desktop_files:
        with open(df, "w", encoding="utf-8") as f:
            f.write(desktop_content)
        # Touch to ensure mtime changes
        os.utime(df, None)
        print(f"Updated desktop entry: {df}")

    # Update desktop database if available
    if shutil.which("update-desktop-database"):
        print("Updating desktop database...")
        subprocess.run(["update-desktop-database", local_apps_dir], check=False)

    # Update GTK icon cache if commands exist
    if shutil.which("gtk-update-icon-cache"):
        print("Updating GTK icon cache...")
        subprocess.run(["gtk-update-icon-cache", "-f", "-t", local_icons_base], check=False)
    if shutil.which("gtk4-update-icon-cache"):
        print("Updating GTK4 icon cache...")
        subprocess.run(["gtk4-update-icon-cache", "-f", "-t", local_icons_base], check=False)

    print("All application, desktop, and Tauri icons successfully updated!")

if __name__ == "__main__":
    generate_icons()

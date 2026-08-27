import os
from PIL import Image

def generate_rgba_icons():
    src_path = "images/waddle-origin.png"
    if not os.path.exists(src_path):
        print(f"Error: {src_path} not found")
        return

    # Open image and convert strictly to RGBA
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    print(f"Source size: {w}x{h}, Mode: {img.mode}")

    # Crop center penguin with cyber background
    box_center = (450, 150, 1050, 750)
    center_icon = img.crop(box_center).convert("RGBA")

    # Output directories
    out_dirs = ["src/assets", "public", "src-tauri/icons", "images"]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    # 512x512 app icon in RGBA
    app_icon_512 = center_icon.resize((512, 512), Image.Resampling.LANCZOS).convert("RGBA")
    app_icon_512.save("src/assets/waddle-icon.png", "PNG")
    app_icon_512.save("public/waddle-icon.png", "PNG")
    app_icon_512.save("images/waddle-icon.png", "PNG")
    app_icon_512.save("src-tauri/icons/icon.png", "PNG")

    # Standard Tauri icon sizes - ALL STRICTLY RGBA
    sizes = {
        "src-tauri/icons/32x32.png": (32, 32),
        "src-tauri/icons/128x128.png": (128, 128),
        "src-tauri/icons/128x128@2x.png": (256, 256),
        "src-tauri/icons/Square30x30Logo.png": (30, 30),
        "src-tauri/icons/Square44x44Logo.png": (44, 44),
        "src-tauri/icons/Square71x71Logo.png": (71, 71),
        "src-tauri/icons/Square89x89Logo.png": (89, 89),
        "src-tauri/icons/Square107x107Logo.png": (107, 107),
        "src-tauri/icons/Square142x142Logo.png": (142, 142),
        "src-tauri/icons/Square150x150Logo.png": (150, 150),
        "src-tauri/icons/Square284x284Logo.png": (284, 284),
        "src-tauri/icons/Square310x310Logo.png": (310, 310),
        "src-tauri/icons/StoreLogo.png": (50, 50),
    }

    for path, sz in sizes.items():
        resized = center_icon.resize(sz, Image.Resampling.LANCZOS).convert("RGBA")
        resized.save(path, "PNG")

    # Create ICO file
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    app_icon_512.save("src-tauri/icons/icon.ico", sizes=ico_sizes)

    # Local icons for Linux / COSMIC DE
    user_home = os.path.expanduser("~")
    local_icons_dir = os.path.join(user_home, ".local/share/icons/hicolor/512x512/apps")
    os.makedirs(local_icons_dir, exist_ok=True)
    app_icon_512.save(os.path.join(local_icons_dir, "waddle.png"), "PNG")
    app_icon_512.save(os.path.join(local_icons_dir, "com.waddle.terminal.png"), "PNG")

    print("All icons successfully converted to RGBA!")

if __name__ == "__main__":
    generate_rgba_icons()

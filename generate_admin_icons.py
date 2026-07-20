"""
Generate admin icons for boyfriend food management page.
Uses Iconify API + svglib for SVG->PNG conversion.
Falls back to Pillow drawing.
"""
import urllib.request
import os
import io
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM
from PIL import Image, ImageDraw

OUTPUT_DIR = r"d:\ZGM\Nini-OneDay-Food\images\admin"
ICON_SIZE = 48  # Admin action icon size

# Warm theme colors
COLOR_PRIMARY = "#E8833A"    # 暖橙主色
COLOR_SUCCESS = "#4CAF50"    # 上架/成功
COLOR_DANGER = "#EF5350"     # 下架/删除
COLOR_MUTED = "#8A7A6B"      # 次要

# Iconify icons for admin actions
ICONS = {
    "shelve": "mdi/eye",               # 上架（可见）
    "unshelve": "mdi/eye-off",         # 下架（不可见）
    "edit": "mdi/pencil",              # 编辑
    "delete": "mdi/trash-can",         # 删除
    "add": "mdi/plus",                 # 新增
    "sort": "mdi/sort",                # 排序
    "search": "mdi/magnify",           # 搜索
}


def download_svg(icon_name, color_hex):
    """Download SVG from Iconify API with specified color."""
    color_clean = color_hex.lstrip("#")
    url = (
        f"https://api.iconify.design/{icon_name}.svg"
        f"?color=%23{color_clean}&width={ICON_SIZE}&height={ICON_SIZE}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def svg_bytes_to_png(svg_bytes, output_path):
    """Convert SVG bytes to PNG file."""
    drawing = svg2rlg(io.BytesIO(svg_bytes))
    if drawing is None:
        raise ValueError("svg2rlg returned None")
    w = drawing.width or ICON_SIZE
    h = drawing.height or ICON_SIZE
    scale = ICON_SIZE / max(w, h)
    drawing.scale(scale, scale)
    drawing.width = ICON_SIZE
    drawing.height = ICON_SIZE
    renderPM.drawToFile(
        drawing, output_path, fmt="PNG", dpi=72, bg=0x00000000,
    )


def hex_to_rgb_tuple(hex_color):
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r, g, b, 255)


def draw_fallback(name, color_hex, output_path):
    """Generate icon using Pillow as fallback."""
    img = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    c = hex_to_rgb_tuple(color_hex)
    cx, cy = ICON_SIZE // 2, ICON_SIZE // 2

    if name == "shelve":
        # Eye shape
        draw.ellipse([cx-12, cy-6, cx+12, cy+6], outline=c, width=3)
        draw.ellipse([cx-4, cy-4, cx+4, cy+4], fill=c)
    elif name == "unshelve":
        # Eye-off with line
        draw.ellipse([cx-12, cy-6, cx+12, cy+6], outline=c, width=3)
        draw.line([(cx-14, cy-8), (cx+14, cy+8)], fill=c, width=3)
    elif name == "edit":
        # Pencil
        draw.polygon([(cx+8, cy-12), (cx+14, cy-6), (cx-6, cy+14), (cx-12, cy+8)], fill=c)
    elif name == "delete":
        # Trash can
        draw.rectangle([cx-10, cy-8, cx+10, cy-4], fill=c)
        draw.rectangle([cx-8, cy-4, cx+8, cy+12], outline=c, width=2)
        draw.rectangle([cx-4, cy, cx-1, cy+8], fill=c)
        draw.rectangle([cx+1, cy, cx+4, cy+8], fill=c)
    elif name == "add":
        draw.rectangle([cx-12, cy-2, cx+12, cy+2], fill=c)
        draw.rectangle([cx-2, cy-12, cx+2, cy+12], fill=c)
    elif name == "sort":
        draw.polygon([(cx, cy-14), (cx+8, cy-4), (cx-8, cy-4)], fill=c)
        draw.polygon([(cx, cy+14), (cx+8, cy+4), (cx-8, cy+4)], fill=c)
    elif name == "search":
        draw.ellipse([cx-10, cy-10, cx+6, cy+6], outline=c, width=3)
        draw.line([(cx+4, cy+4), (cx+14, cy+14)], fill=c, width=3)

    img.save(output_path, "PNG")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    tasks = [
        ("shelve", COLOR_SUCCESS, "shelve.png"),
        ("unshelve", COLOR_DANGER, "unshelve.png"),
        ("edit", COLOR_PRIMARY, "edit.png"),
        ("delete", COLOR_DANGER, "delete.png"),
        ("add", COLOR_PRIMARY, "add.png"),
        ("sort", COLOR_MUTED, "sort.png"),
        ("search", COLOR_MUTED, "search.png"),
    ]

    for icon_key, color, filename in tasks:
        output_path = os.path.join(OUTPUT_DIR, filename)
        iconify_name = ICONS[icon_key]
        used_method = ""

        try:
            print(f"[{filename}] Downloading {iconify_name} ({color})...")
            svg_bytes = download_svg(iconify_name, color)
            if b"<svg" not in svg_bytes:
                raise ValueError("Response is not SVG")
            svg_bytes_to_png(svg_bytes, output_path)
            used_method = "Iconify + svglib"
            with Image.open(output_path) as verify_img:
                verify_img.verify()
            print(f"  PNG verified OK")
        except Exception as e:
            print(f"  Download failed ({e}), using Pillow fallback...")
            draw_fallback(icon_key, color, output_path)
            used_method = "Pillow fallback"

        size = os.path.getsize(output_path)
        print(f"  -> {filename} ({size} bytes) [{used_method}]")

    print("\n=== All admin icons generated! ===")


if __name__ == "__main__":
    main()

"""Generate tabbar icons for boyfriend food-admin tab."""
import urllib.request
import os
import io
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM
from PIL import Image, ImageDraw

OUTPUT_DIR = r"d:\ZGM\Nini-OneDay-Food\images\tabbar"
ICON_SIZE = 81

COLOR_INACTIVE = "#999999"
COLOR_ACTIVE = "#E8833A"

# Chef-hat / pot icon for food management
ICON_NAME = "mdi/chef-hat"


def download_svg(icon_name, color_hex):
    color_clean = color_hex.lstrip("#")
    url = (
        f"https://api.iconify.design/{icon_name}.svg"
        f"?color=%23{color_clean}&width={ICON_SIZE}&height={ICON_SIZE}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def svg_bytes_to_png(svg_bytes, output_path):
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


def draw_chef_hat(draw, color_rgb):
    """Draw a simple chef hat icon."""
    c = color_rgb
    cx, cy = ICON_SIZE // 2, ICON_SIZE // 2
    # Hat brim
    draw.rectangle([cx-24, cy+10, cx+24, cy+20], fill=c)
    # Hat top (cloud shape)
    draw.ellipse([cx-28, cy-22, cx-8, cy+8], fill=c)
    draw.ellipse([cx-16, cy-28, cx+16, cy+2], fill=c)
    draw.ellipse([cx+8, cy-22, cx+28, cy+8], fill=c)
    # Fill center gap
    draw.rectangle([cx-16, cy-14, cx+16, cy+10], fill=c)


def draw_fallback(color_hex, output_path):
    img = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    color_rgb = hex_to_rgb_tuple(color_hex)
    draw_chef_hat(draw, color_rgb)
    img.save(output_path, "PNG")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    tasks = [
        (COLOR_INACTIVE, "food-admin.png"),
        (COLOR_ACTIVE, "food-admin-active.png"),
    ]

    for color, filename in tasks:
        output_path = os.path.join(OUTPUT_DIR, filename)
        try:
            print(f"[{filename}] Downloading {ICON_NAME} ({color})...")
            svg_bytes = download_svg(ICON_NAME, color)
            if b"<svg" not in svg_bytes:
                raise ValueError("Response is not SVG")
            svg_bytes_to_png(svg_bytes, output_path)
            with Image.open(output_path) as verify_img:
                verify_img.verify()
            print(f"  PNG verified OK")
        except Exception as e:
            print(f"  Download failed ({e}), using Pillow fallback...")
            draw_fallback(color, output_path)

        size = os.path.getsize(output_path)
        print(f"  -> {filename} ({size} bytes)")

    print("\n=== TabBar food-admin icons generated! ===")


if __name__ == "__main__":
    main()

"""
Download tabbar icons from Iconify API (internet) and convert to PNG.
Uses svglib + rlPyCairo for SVG->PNG conversion.
Falls back to Pillow drawing if any step fails.
"""
import urllib.request
import os
import io
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM
from PIL import Image, ImageDraw

OUTPUT_DIR = r"C:\Users\1\WeChatProjects\miniprogram-1\images\tabbar"
ICON_SIZE = 81  # WeChat recommended tabbar icon size

# Colors from app.json tabBar config
COLOR_INACTIVE = "#7A7E83"
COLOR_ACTIVE = "#3cc51f"

# Iconify icon names
ICONS = {
    "home": "mdi/home",
    "food": "mdi/silverware-fork-knife",
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
    """Convert SVG bytes to PNG file using svglib + reportlab + rlPyCairo."""
    drawing = svg2rlg(io.BytesIO(svg_bytes))
    if drawing is None:
        raise ValueError("svg2rlg returned None - failed to parse SVG")

    # Calculate scale to fit ICON_SIZE
    w = drawing.width or ICON_SIZE
    h = drawing.height or ICON_SIZE
    scale = ICON_SIZE / max(w, h)
    drawing.scale(scale, scale)
    drawing.width = ICON_SIZE
    drawing.height = ICON_SIZE

    renderPM.drawToFile(
        drawing,
        output_path,
        fmt="PNG",
        dpi=72,
        bg=0x00000000,  # transparent background
    )


def draw_home_icon(draw, color_rgb):
    """Draw a simple home/house icon - clean Material Design style."""
    c = color_rgb
    # Roof (triangle)
    draw.polygon([(40, 10), (8, 40), (72, 40)], fill=c)
    # Body (rectangle)
    draw.rectangle([16, 38, 64, 70], fill=c)
    # Door (transparent cutout)
    draw.rectangle([34, 48, 46, 70], fill=(0, 0, 0, 0))


def draw_food_icon(draw, color_rgb):
    """Draw a fork and knife icon - clean style."""
    c = color_rgb
    # Fork (left)
    draw.rectangle([18, 14, 21, 34], fill=c)  # left prong
    draw.rectangle([24, 14, 27, 34], fill=c)  # right prong
    draw.rectangle([18, 14, 27, 18], fill=c)  # prong connector bar
    draw.rectangle([21, 30, 24, 68], fill=c)  # handle
    # Knife (right)
    draw.polygon([(55, 14), (62, 14), (60, 34), (57, 34)], fill=c)  # blade
    draw.rectangle([57, 30, 60, 68], fill=c)  # handle


def hex_to_rgb_tuple(hex_color):
    """Convert hex color to RGBA tuple."""
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r, g, b, 255)


def generate_icon_fallback(name, color_hex, output_path):
    """Generate icon using Pillow as fallback."""
    img = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    color_rgb = hex_to_rgb_tuple(color_hex)
    if name == "home":
        draw_home_icon(draw, color_rgb)
    elif name == "food":
        draw_food_icon(draw, color_rgb)
    img.save(output_path, "PNG")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    tasks = [
        ("home", COLOR_INACTIVE, "home.png"),
        ("home", COLOR_ACTIVE, "home-active.png"),
        ("food", COLOR_INACTIVE, "food.png"),
        ("food", COLOR_ACTIVE, "food-active.png"),
    ]

    for icon_key, color, filename in tasks:
        output_path = os.path.join(OUTPUT_DIR, filename)
        iconify_name = ICONS[icon_key]
        used_method = ""

        # Try downloading from internet + converting
        try:
            print(f"[{filename}] Downloading {iconify_name} ({color}) from Iconify...")
            svg_bytes = download_svg(iconify_name, color)
            print(f"  Downloaded SVG ({len(svg_bytes)} bytes)")

            if b"<svg" not in svg_bytes:
                raise ValueError("Response is not SVG")

            print(f"  Converting SVG -> PNG (svglib + rlPyCairo)...")
            svg_bytes_to_png(svg_bytes, output_path)
            used_method = "downloaded (Iconify) + svglib"

            # Verify the output PNG is valid
            with Image.open(output_path) as verify_img:
                verify_img.verify()
            print(f"  PNG verified OK")

        except Exception as e:
            print(f"  Download/conversion failed ({e})")
            print(f"  Falling back to Pillow drawing...")
            generate_icon_fallback(icon_key, color, output_path)
            used_method = "Pillow (offline fallback)"

        size = os.path.getsize(output_path)
        print(f"  -> {filename} ({size} bytes) [{used_method}]")

    print("\n=== All 4 icons generated! ===")


if __name__ == "__main__":
    main()

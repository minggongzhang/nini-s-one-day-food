"""Regenerate food-admin tabbar icons with correct active color #FF8A9E."""
import os
from PIL import Image, ImageDraw

OUTPUT_DIR = r"d:\ZGM\Nini-OneDay-Food\images\tabbar"
ICON_SIZE = 81

COLOR_INACTIVE = "#999999"
COLOR_ACTIVE = "#FF8A9E"


def hex_to_rgb_tuple(hex_color):
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r, g, b, 255)


def draw_chef_hat(draw, color_rgb):
    c = color_rgb
    cx, cy = ICON_SIZE // 2, ICON_SIZE // 2
    draw.rectangle([cx-24, cy+10, cx+24, cy+20], fill=c)
    draw.ellipse([cx-28, cy-22, cx-8, cy+8], fill=c)
    draw.ellipse([cx-16, cy-28, cx+16, cy+2], fill=c)
    draw.ellipse([cx+8, cy-22, cx+28, cy+8], fill=c)
    draw.rectangle([cx-16, cy-14, cx+16, cy+10], fill=c)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for color, filename in [
        (COLOR_INACTIVE, "food-admin.png"),
        (COLOR_ACTIVE, "food-admin-active.png"),
    ]:
        output_path = os.path.join(OUTPUT_DIR, filename)
        img = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw_chef_hat(draw, hex_to_rgb_tuple(color))
        img.save(output_path, "PNG")
        print(f"  -> {filename} ({os.path.getsize(output_path)} bytes)")

    print("\n=== Done! ===")


if __name__ == "__main__":
    main()
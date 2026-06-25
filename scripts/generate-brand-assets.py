"""Generate brand assets from SVG sources.

Produces:
  apps/web/src/app/icon.svg       (master, used by Next.js App Router)
  apps/web/src/app/apple-icon.svg (Apple touch, used by Next.js App Router)
  apps/web/public/favicon.ico     (legacy 32x32 ICO for old browsers)
  apps/web/public/favicon-16.png
  apps/web/public/favicon-32.png
  apps/web/public/apple-touch-icon.png   (180x180)
  apps/web/public/icon-192.png           (PWA)
  apps/web/public/icon-512.png           (PWA)
  apps/mobile/assets/icon.png            (1024x1024 Expo app icon)
  apps/mobile/assets/adaptive-icon.png   (1024x1024 Android adaptive)
  apps/mobile/assets/splash-icon.png     (1024x1024 splash)

Run from project root: python3 scripts/generate-brand-assets.py
"""
from pathlib import Path
import cairosvg
from PIL import Image
import io

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "brand"

# (source_svg, output_path, size_px, [bg_color or None])
JOBS = [
    # Web — Next.js App Router picks up icon.svg / apple-icon.svg from app/
    (BRAND / "favicon.svg", ROOT / "apps/web/src/app/icon.svg", None, None),
    (BRAND / "favicon.svg", ROOT / "apps/web/src/app/apple-icon.svg", None, None),
    # Web — public/ assets for explicit referencing
    (BRAND / "favicon.svg", ROOT / "apps/web/public/favicon-16.png", 16, "#111111"),
    (BRAND / "favicon.svg", ROOT / "apps/web/public/favicon-32.png", 32, "#111111"),
    (BRAND / "favicon.svg", ROOT / "apps/web/public/favicon-48.png", 48, "#111111"),
    (BRAND / "mark.svg",    ROOT / "apps/web/public/apple-touch-icon.png", 180, "#111111"),
    (BRAND / "mark.svg",    ROOT / "apps/web/public/icon-192.png", 192, "#111111"),
    (BRAND / "mark.svg",    ROOT / "apps/web/public/icon-512.png", 512, "#111111"),
    # Mobile — Expo
    (BRAND / "mark.svg",    ROOT / "apps/mobile/assets/icon.png", 1024, "#111111"),
    (BRAND / "mark.svg",    ROOT / "apps/mobile/assets/adaptive-icon.png", 1024, "#111111"),
    (BRAND / "mark.svg",    ROOT / "apps/mobile/assets/splash-icon.png", 1024, "#111111"),
]


def render_svg_to_png(svg_path: Path, size: int) -> bytes:
    png_bytes = cairosvg.svg2png(
        url=str(svg_path),
        output_width=size,
        output_height=size,
    )
    return png_bytes


def main() -> None:
    for src, dst, size, _bg in JOBS:
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.suffix == ".svg" or size is None:
            # Copy SVG content as-is.
            dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"  svg  {dst.relative_to(ROOT)}")
            continue
        png = render_svg_to_png(src, size)
        dst.write_bytes(png)
        print(f"  png  {dst.relative_to(ROOT)}  ({size}x{size})")

    # Generate a true multi-size favicon.ico (16+32+48 packed).
    # For ICO, PIL writes all sizes from a single source image when given `sizes`.
    ico_path = ROOT / "apps/web/public/favicon.ico"
    ico_path.parent.mkdir(parents=True, exist_ok=True)
    sizes = [(16, 16), (32, 32), (48, 48)]
    # Render at the largest size, then let PIL downscale.
    base = Image.open(io.BytesIO(render_svg_to_png(BRAND / "favicon.svg", 256)))
    base.save(ico_path, format="ICO", sizes=sizes)
    print(f"  ico  {ico_path.relative_to(ROOT)}  (16+32+48)")


if __name__ == "__main__":
    main()

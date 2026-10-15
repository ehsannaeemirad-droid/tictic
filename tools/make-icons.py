#!/usr/bin/env python3
"""Generate the TicTic mark: SVG sources + every PNG size the manifest,
Apple and browsers ask for. One geometry, no image libraries.

  python3 tools/make-icons.py

Mark: a rounded square (the "card") carrying one confident tick - the app is
called TicTic, and the tick is the gesture the whole product is about.
Geometry is expressed on a 0..1 canvas so every size is exact.

Colour: the clay accent with a warm cream tick, matching --accent/--accent-contrast
of the default "paper" theme. Regenerate if those tokens change.
"""
import math, struct, zlib, os, pathlib

CLAY = (192, 57, 43)          # --clay-600
CREAM = (255, 246, 238)
OUT = pathlib.Path("public/icons")
OUT.mkdir(parents=True, exist_ok=True)

# ---- geometry on a 0..1 canvas -------------------------------------------
RADIUS = 0.26                 # corner radius of the card
STROKE = 0.115                # tick stroke width
# tick polyline: down-right then up-right
TICK = [(0.26, 0.53), (0.43, 0.70), (0.76, 0.32)]


def rounded_card_coverage(x, y, inset, radius=RADIUS):
    """Is the point inside the rounded square [inset, 1-inset]?"""
    lo, hi = inset, 1.0 - inset
    if x < lo or x > hi or y < lo or y > hi:
        return False
    cx = min(max(x, lo + radius), hi - radius)
    cy = min(max(y, lo + radius), hi - radius)
    if (x, y) == (cx, cy):
        return True
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def dist_to_segment(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    L = vx * vx + vy * vy
    t = 0.0 if L == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / L))
    dx, dy = px - (ax + t * vx), py - (ay + t * vy)
    return math.hypot(dx, dy)


def tick_coverage(x, y, inset):
    """Anti-aliased coverage of the tick (round caps and joins) at a point."""
    half = STROKE / 2
    # map the inset canvas back to the full 0..1 space
    scale = 1.0 - 2 * inset
    sx, sy = (x - inset) / scale, (y - inset) / scale
    d = min(dist_to_segment(sx, sy, *TICK[i], *TICK[i + 1]) for i in range(len(TICK) - 1))
    # 0.75px feather for the scanline resolution
    feather = 0.004
    return max(0.0, min(1.0, (half - d) / feather + 0.5))


def render(size, card_inset, tick_inset, bg, fg, samples=3):
    """RGBA bytes for one icon: rounded card + tick, supersampled.
    The two insets are separate so a maskable icon can be full-bleed while
    its tick stays inside the 80% safe zone."""
    rows = []
    step = 1.0 / (size * samples)
    for py in range(size):
        row = bytearray()
        for px in range(size):
            bg_cov = 0.0
            fg_cov = 0.0
            for sy in range(samples):
                for sx in range(samples):
                    x = (px * samples + sx + 0.5) * step
                    y = (py * samples + sy + 0.5) * step
                    if bg and rounded_card_coverage(x, y, card_inset):
                        bg_cov += 1.0
                    if fg and tick_coverage(x, y, tick_inset) > 0.5:
                        fg_cov += 1.0
            n = samples * samples
            bg_cov /= n
            fg_cov /= n
            # composite: fg over bg over transparent
            a = max(bg_cov, fg_cov) if bg else fg_cov
            if a <= 0:
                row += b"\x00\x00\x00\x00"
                continue
            if bg:
                r = (bg[0] * bg_cov * (1 - fg_cov) + fg[0] * fg_cov) / a
                g = (bg[1] * bg_cov * (1 - fg_cov) + fg[1] * fg_cov) / a
                b = (bg[2] * bg_cov * (1 - fg_cov) + fg[2] * fg_cov) / a
            else:
                r, g, b = fg
            row += bytes((round(r), round(g), round(b), round(a * 255)))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)
    return len(png)


def svg(path, inset, bg, fg, box=100):
    lo = inset * box
    size = box - 2 * lo
    r = RADIUS * size
    pts = " ".join(f"{lo + x * size:.1f},{lo + y * size:.1f}" for x, y in TICK)
    sw = STROKE * size
    body = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {box} {box}" role="img" aria-label="TicTic">
  <rect x="{lo:.1f}" y="{lo:.1f}" width="{size:.1f}" height="{size:.1f}" rx="{r:.1f}" fill="#{bg[0]:02X}{bg[1]:02X}{bg[2]:02X}"/>
  <polyline points="{pts}" fill="none" stroke="#{fg[0]:02X}{fg[1]:02X}{fg[2]:02X}" stroke-width="{sw:.1f}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
"""
    path.write_text(body, encoding="utf-8")
    return len(body)


print("icons -> public/icons/")
print(f"  favicon.svg              {svg(OUT / 'favicon.svg', 0.06, CLAY, CREAM):>6} B   (SVG, rounded card)")
print(f"  logo.svg                 {svg(OUT / 'logo.svg', 0.02, CLAY, CREAM):>6} B   (for the sidebar)")
TARGETS = [
    # name, size, card inset, tick inset
    ("favicon-48.png", 48, 0.08, 0.08),
    ("icon-192.png", 192, 0.08, 0.08),
    ("icon-512.png", 512, 0.08, 0.08),
    ("apple-touch-icon-180.png", 180, 0.0, 0.0),      # full bleed, iOS applies its own mask
    ("maskable-512.png", 512, 0.0, 0.20),             # full bleed; tick inside the safe zone
]
for name, size, card_inset, tick_inset in TARGETS:
    rows = render(size, card_inset, tick_inset, CLAY, CREAM)
    n = write_png(OUT / name, size, rows)
    print(f"  {name:<24} {n:>6} B   ({size}x{size})")
print("\ndone - manifest.json and index.html reference these names.")

from PIL import Image, ImageDraw, ImageFont
import os
import math

# ======================================================
# CONFIG
# ======================================================

WIDTH  = 1600
HEIGHT = 1000

# Palette
BG          = (245, 241, 234)
ROOM_FILL   = (232, 224, 210)
ROOM_INNER  = (250, 247, 241)
HALLWAY_F   = (255, 253, 249)
HALLWAY_O   = (210, 188, 158)
OUTLINE     = (130, 103, 68)
TEXT_DARK   = (58, 44, 30)
TEXT_MID    = (105, 83, 58)
ACCENT      = (179, 139, 89)
ACCENT_SOFT = (213, 191, 162)
ATRIUM_F    = (238, 233, 224)
ATRIUM_I    = (248, 244, 238)
NODE_COL    = (179, 139, 89)
NODE_RING   = (100, 72, 40)
EDGE_COL    = (179, 139, 89, 90)   # semi-transparent

MAP_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', 'public', 'images', 'museum-map.png'
)
os.makedirs(os.path.dirname(MAP_PATH), exist_ok=True)

# ======================================================
# CANVAS
# ======================================================

img  = Image.new("RGBA", (WIDTH, HEIGHT), BG + (255,))
draw = ImageDraw.Draw(img, "RGBA")

# ======================================================
# FONTS
# ======================================================

def load_font(name, size):
    for path in [name, f"/usr/share/fonts/truetype/dejavu/DejaVu{name}.ttf",
                 f"/usr/share/fonts/truetype/liberation/Liberation{name}.ttf"]:
        try:
            return ImageFont.truetype(path, size)
        except:
            pass
    return ImageFont.load_default()

font_title  = load_font("Sans-Bold", 34)
font_room   = load_font("Sans-Bold", 24)
font_small  = load_font("Sans", 17)
font_tiny   = load_font("Sans", 13)

# ======================================================
# HELPERS
# ======================================================

def pct(px, py):
    """Convert pixel coords to percentage coords (for node data)."""
    return round(px / WIDTH * 100, 1), round(py / HEIGHT * 100, 1)

def rect_center(x1, y1, x2, y2):
    return (x1 + x2) // 2, (y1 + y2) // 2

def draw_room(x1, y1, x2, y2, label, sublabel=None, radius=20):
    # Shadow
    draw.rounded_rectangle([x1+4, y1+4, x2+4, y2+4], radius=radius,
                            fill=(180, 160, 130, 60))
    # Body
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius,
                            fill=ROOM_FILL, outline=OUTLINE, width=5)
    # Inner
    pad = 16
    draw.rounded_rectangle([x1+pad, y1+pad, x2-pad, y2-pad],
                            radius=radius-6, fill=ROOM_INNER)
    # Label
    cx, cy = rect_center(x1, y1, x2, y2)
    bbox = draw.textbbox((0,0), label, font=font_room)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    offset = -12 if sublabel else 0
    draw.text((cx - tw//2, cy - th//2 + offset), label, fill=TEXT_DARK, font=font_room)
    if sublabel:
        bbox2 = draw.textbbox((0,0), sublabel, font=font_tiny)
        tw2 = bbox2[2]-bbox2[0]
        draw.text((cx - tw2//2, cy + th//2 + offset + 4), sublabel,
                  fill=TEXT_MID, font=font_tiny)

def draw_hallway(x1, y1, x2, y2, radius=8):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius,
                            fill=HALLWAY_F, outline=HALLWAY_O, width=2)

def draw_door(x, y, horizontal=True, size=20):
    if horizontal:
        draw.rounded_rectangle([x-size, y-5, x+size, y+5], radius=4, fill=ACCENT)
        draw.rounded_rectangle([x-size+2, y-3, x+size-2, y+3], radius=2,
                                fill=(210, 175, 110))
    else:
        draw.rounded_rectangle([x-5, y-size, x+5, y+size], radius=4, fill=ACCENT)
        draw.rounded_rectangle([x-3, y-size+2, x+3, y+size-2], radius=2,
                                fill=(210, 175, 110))

def draw_compass(cx, cy, r=38):
    """Draw a simple compass rose."""
    draw.ellipse([cx-r, cy-r, cx+r, cy+r],
                 fill=(250,247,242), outline=ACCENT_SOFT, width=2)
    for angle, label in [(0,'N'),(90,'E'),(180,'S'),(270,'W')]:
        rad = math.radians(angle - 90)
        tx = cx + int((r-10) * math.cos(rad))
        ty = cy + int((r-10) * math.sin(rad))
        b = draw.textbbox((0,0), label, font=font_tiny)
        draw.text((tx-(b[2]-b[0])//2, ty-(b[3]-b[1])//2), label,
                  fill=TEXT_MID, font=font_tiny)
    # Needle
    draw.polygon([cx, cy-r+14, cx-4, cy+4, cx, cy+8, cx+4, cy+4],
                 fill=ACCENT)

# ======================================================
# SUBTLE GRID / TEXTURE
# ======================================================

for gx in range(0, WIDTH, 40):
    draw.line([(gx, 0), (gx, HEIGHT)], fill=(200,190,175,35), width=1)
for gy in range(0, HEIGHT, 40):
    draw.line([(0, gy), (WIDTH, gy)], fill=(200,190,175,35), width=1)

# ======================================================
# OUTER BORDER
# ======================================================

margin = 36
draw.rounded_rectangle([margin, margin, WIDTH-margin, HEIGHT-margin],
                        radius=28, outline=OUTLINE, width=7, fill=None)

# ======================================================
# HALLWAYS (draw first, rooms sit on top)
# ======================================================

# Top horizontal spine
draw_hallway(420, 140, 980, 215)

# Top connectors → atrium
draw_hallway(415, 185, 475, 265)   # top-left
draw_hallway(1125, 185, 1185, 265) # top-right

# Left vertical corridor (atrium left side)
draw_hallway(515, 330, 625, 620)

# Right vertical corridor (atrium right side)
draw_hallway(975, 330, 1085, 620)

# Mid-left connector → History Wing
draw_hallway(355, 468, 475, 538)

# Mid-right connector → Innovation Hall
draw_hallway(1125, 468, 1245, 538)

# Bottom horizontal spine
draw_hallway(535, 778, 980, 858)

# Bottom-left connector → Temp Exhibit
draw_hallway(535, 780, 645, 838)

# Bottom-right connector → Archive
draw_hallway(955, 780, 1065, 838)

# Center vertical spine inside atrium
draw_hallway(730, 210, 870, 790)

# ======================================================
# ROOMS
# ======================================================

draw_room(80,  100, 420, 330, "Gallery A",       "Historical Collections")
draw_room(1180,100,1520, 330, "Gallery B",       "International Exhibits")
draw_room(80,  390, 360, 610, "History Wing",    "Records & Milestones")
draw_room(1240,390,1520, 610, "Innovation Hall", "Tech & Engineering")
draw_room(80,  690, 540, 900, "Temporary Exhibit","Rotating Collections")
draw_room(1060,690,1520, 900, "Museum Archive",  "Research & Records")
draw_room(640, 760, 960, 900, "Café",            "Refreshments & Seating")

# ======================================================
# CENTRAL ATRIUM
# ======================================================

draw.rounded_rectangle([465, 248, 1135, 705], radius=24,
                        fill=ATRIUM_F, outline=OUTLINE, width=6)
draw.rounded_rectangle([492, 272, 1108, 682], radius=18, fill=ATRIUM_I)

# Atrium title
bbox = draw.textbbox((0,0), "Central Atrium", font=font_title)
tw = bbox[2]-bbox[0]
draw.text((WIDTH//2 - tw//2, 418), "Central Atrium", fill=TEXT_DARK, font=font_title)

bbox2 = draw.textbbox((0,0), "Information  •  Ticketing  •  Navigation", font=font_small)
tw2 = bbox2[2]-bbox2[0]
draw.text((WIDTH//2 - tw2//2, 468), "Information  •  Ticketing  •  Navigation",
          fill=TEXT_MID, font=font_small)

# ======================================================
# DOORS
# ======================================================

doors = [
    (420, 215, False),   # Gallery A → top corridor
    (1180,215, False),   # Gallery B → top corridor
    (362, 503, False),   # History Wing → mid-left connector
    (1238,503, False),   # Innovation Hall → mid-right connector
    (540, 808, False),   # Temp Exhibit → bottom-left connector
    (1060,808, False),   # Archive → bottom-right connector
    (640, 808, False),   # Café left entrance
    (960, 808, False),   # Café right entrance
]
for x, y, h in doors:
    draw_door(x, y, h)

# ======================================================
# NAV NODES + EDGES  (drawn semi-transparent on top)
# ======================================================
#
# All coordinates in PIXELS here; we'll print the % values
# for copy-paste into mapData.js
#
# Node naming convention:
#   Rooms:   ga (Gallery A), gb, hw (History Wing), ih, te, ar, cafe
#   Atrium:  atr_*
#   Spine:   sp_* (center vertical)
#   Top:     top_*
#   Corridors: lc_* (left corridor), rc_* (right corridor)
#   Connectors: tlc, trc, mlc, mrc, blc, brc
#   Bottom:  bot_*

nodes_px = {
    # ── Top horizontal corridor ──────────────────────────
    "top_gaExit":   (420, 177),   # Gallery A door exit
    "top_l":        (540, 177),
    "top_cl":       (660, 177),
    "top_c":        (800, 177),
    "top_cr":       (940, 177),
    "top_r":        (1060,177),
    "top_gbExit":   (1180,177),   # Gallery B door exit

    # ── Top-left connector (Gallery A → Atrium) ─────────
    "tlc_t":        (443, 210),
    "tlc_b":        (443, 255),

    # ── Top-right connector (Gallery B → Atrium) ────────
    "trc_t":        (1157,210),
    "trc_b":        (1157,255),

    # ── Atrium top row ───────────────────────────────────
    "atr_tl":       (540, 290),
    "atr_tc":       (800, 290),
    "atr_tr":       (1060,290),

    # ── Center vertical spine ────────────────────────────
    "sp_t":         (800, 230),
    "sp_1":         (800, 320),
    "sp_2":         (800, 400),
    "sp_c":         (800, 475),   # atrium center
    "sp_3":         (800, 550),
    "sp_4":         (800, 630),
    "sp_5":         (800, 710),
    "sp_b":         (800, 780),

    # ── Left corridor (vertical) ─────────────────────────
    "lc_t":         (570, 340),
    "lc_1":         (570, 410),
    "lc_2":         (570, 480),
    "lc_3":         (570, 550),
    "lc_b":         (570, 610),

    # ── Right corridor (vertical) ────────────────────────
    "rc_t":         (1030,340),
    "rc_1":         (1030,410),
    "rc_2":         (1030,480),
    "rc_3":         (1030,550),
    "rc_b":         (1030,610),

    # ── Atrium bottom row ────────────────────────────────
    "atr_bl":       (570, 665),
    "atr_bc":       (800, 665),
    "atr_br":       (1030,665),

    # ── Mid-left connector (→ History Wing) ─────────────
    "mlc_r":        (470, 503),
    "mlc_l":        (362, 503),
    "hw_entry":     (358, 503),   # History Wing entrance

    # ── Mid-right connector (→ Innovation Hall) ──────────
    "mrc_l":        (1130,503),
    "mrc_r":        (1238,503),
    "ih_entry":     (1242,503),   # Innovation Hall entrance

    # ── Bottom spine & connectors ────────────────────────
    "bot_lc":       (570, 808),
    "bot_l":        (660, 808),
    "bot_cl":       (730, 808),
    "bot_c":        (800, 808),
    "bot_cr":       (870, 808),
    "bot_r":        (940, 808),
    "bot_rc":       (1030,808),

    # ── Bottom-left connector (→ Temp Exhibit) ───────────
    "blc_r":        (570, 808),   # same as bot_lc
    "blc_l":        (490, 808),
    "te_entry":     (486, 808),   # Temp Exhibit entrance

    # ── Bottom-right connector (→ Archive) ───────────────
    "brc_l":        (1030,808),   # same as bot_rc
    "brc_r":        (1110,808),
    "ar_entry":     (1114,808),   # Archive entrance

    # ── Room interior anchor nodes ────────────────────────
    "ga_c":         (250, 215),   # Gallery A center
    "gb_c":         (1350,215),   # Gallery B center
    "hw_c":         (220, 500),   # History Wing center
    "ih_c":         (1380,500),   # Innovation Hall center
    "te_c":         (310, 795),   # Temp Exhibit center
    "ar_c":         (1290,795),   # Archive center
    "cafe_l":       (700, 830),   # Café left
    "cafe_c":       (800, 830),   # Café center
    "cafe_r":       (900, 830),   # Café right
}

# Adjacency list (undirected – we'll add both directions)
edges = [
    # Top corridor
    ("top_gaExit","top_l"), ("top_l","top_cl"), ("top_cl","top_c"),
    ("top_c","top_cr"), ("top_cr","top_r"), ("top_r","top_gbExit"),

    # Gallery A ↔ top corridor via connector
    ("ga_c","top_gaExit"),
    ("top_gaExit","tlc_t"), ("tlc_t","tlc_b"), ("tlc_b","atr_tl"),

    # Gallery B ↔ top corridor via connector
    ("gb_c","top_gbExit"),
    ("top_gbExit","trc_t"), ("trc_t","trc_b"), ("trc_b","atr_tr"),

    # Top corridor → spine
    ("top_c","sp_t"), ("sp_t","sp_1"),

    # Atrium top row
    ("atr_tl","atr_tc"), ("atr_tc","atr_tr"),
    ("atr_tl","lc_t"), ("atr_tr","rc_t"),
    ("atr_tc","sp_1"),

    # Spine
    ("sp_1","sp_2"), ("sp_2","sp_c"), ("sp_c","sp_3"),
    ("sp_3","sp_4"), ("sp_4","sp_5"), ("sp_5","sp_b"),

    # Left corridor
    ("lc_t","lc_1"), ("lc_1","lc_2"), ("lc_2","lc_3"), ("lc_3","lc_b"),
    ("lc_1","sp_2"),  # cross-connect to spine
    ("lc_2","mlc_r"), # mid-left connector junction
    ("lc_3","sp_3"),  # cross-connect

    # Right corridor
    ("rc_t","rc_1"), ("rc_1","rc_2"), ("rc_2","rc_3"), ("rc_3","rc_b"),
    ("rc_1","sp_2"),
    ("rc_2","mrc_l"),
    ("rc_3","sp_3"),

    # Atrium bottom row
    ("lc_b","atr_bl"), ("atr_bl","atr_bc"), ("atr_bc","atr_br"), ("atr_br","rc_b"),
    ("atr_bc","sp_4"),
    ("atr_bl","sp_4"),
    ("atr_br","sp_4"),

    # Mid-left connector → History Wing
    ("mlc_r","mlc_l"), ("mlc_l","hw_entry"), ("hw_entry","hw_c"),

    # Mid-right connector → Innovation Hall
    ("mrc_l","mrc_r"), ("mrc_r","ih_entry"), ("ih_entry","ih_c"),

    # Spine bottom → bottom spine
    ("sp_b","bot_c"),

    # Atrium bottom → bottom spine
    ("atr_bl","bot_lc"), ("atr_br","bot_rc"),

    # Bottom spine
    ("bot_lc","bot_l"), ("bot_l","bot_cl"), ("bot_cl","bot_c"),
    ("bot_c","bot_cr"), ("bot_cr","bot_r"), ("bot_r","bot_rc"),

    # Bottom spine → café
    ("bot_cl","cafe_l"), ("bot_c","cafe_c"), ("bot_cr","cafe_r"),
    ("cafe_l","cafe_c"), ("cafe_c","cafe_r"),

    # Bottom-left connector → Temp Exhibit
    ("bot_lc","blc_l"), ("blc_l","te_entry"), ("te_entry","te_c"),

    # Bottom-right connector → Archive
    ("bot_rc","brc_r"), ("brc_r","ar_entry"), ("ar_entry","ar_c"),
]

# De-duplicate merged nodes (bot_lc == blc_r, bot_rc == brc_l)
# Build draw list of unique nodes
unique_nodes = {}
for name, (px, py) in nodes_px.items():
    unique_nodes[name] = (px, py)

# Draw edges first (under nodes)
edge_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
edge_draw  = ImageDraw.Draw(edge_layer)

drawn_edges = set()
for a, b in edges:
    key = tuple(sorted([a, b]))
    if key in drawn_edges:
        continue
    drawn_edges.add(key)
    if a in unique_nodes and b in unique_nodes:
        ax, ay = unique_nodes[a]
        bx, by = unique_nodes[b]
        edge_draw.line([(ax, ay),(bx, by)], fill=(179,139,89,110), width=3)

img = Image.alpha_composite(img, edge_layer)
draw = ImageDraw.Draw(img, "RGBA")

# Draw nodes
for name, (px, py) in unique_nodes.items():
    is_room = name in ("ga_c","gb_c","hw_c","ih_c","te_c","ar_c",
                       "cafe_c","cafe_l","cafe_r")
    r = 9 if is_room else 6
    fill = (215, 168, 90) if is_room else NODE_COL
    draw.ellipse([px-r, py-r, px+r, py+r], fill=fill, outline=NODE_RING, width=2)

# ======================================================
# LEGEND  (repositioned to bottom-left)
# ======================================================

lx, ly = 55, HEIGHT - 200
draw.rounded_rectangle([lx, ly, lx+280, ly+150], radius=14,
                        fill=(252,249,244,230), outline=ACCENT_SOFT, width=2)
draw.text((lx+16, ly+14), "Map Legend", fill=TEXT_DARK, font=font_room)

draw.line([(lx+16, ly+54),(lx+64, ly+54)], fill=ACCENT, width=5)
draw.text((lx+76, ly+44), "Suggested Route", fill=TEXT_MID, font=font_tiny)

draw.ellipse([lx+16, ly+76, lx+36, ly+96], fill=(65,135,255))
draw.text((lx+50, ly+76), "You Are Here", fill=TEXT_MID, font=font_tiny)

draw.ellipse([lx+16, ly+106, lx+30, ly+120], fill=NODE_COL, outline=NODE_RING, width=2)
draw.text((lx+50, ly+106), "Nav Waypoint", fill=TEXT_MID, font=font_tiny)

# ======================================================
# COMPASS ROSE  (bottom-right)
# ======================================================

draw_compass(WIDTH - 90, HEIGHT - 90, r=42)

# ======================================================
# PRINT NODE DATA FOR mapData.js
# ======================================================

print("=" * 60)
print("NAV_NODES percentage coordinates for mapData.js:")
print("=" * 60)

# Build adjacency as sets for clean output
adj = {n: set() for n in unique_nodes}
for a, b in edges:
    if a in adj and b in adj:
        adj[a].add(b)
        adj[b].add(a)

for name, (px, py) in unique_nodes.items():
    xp, yp = pct(px, py)
    nbrs = sorted(adj[name])
    nbrs_str = ", ".join(f"'{n}'" for n in nbrs)
    print(f"  {{ id: '{name}', x: {xp}, y: {yp}, neighbors: [{nbrs_str}] }},")

# ======================================================
# SAVE
# ======================================================

out = img.convert("RGB")
out.save(MAP_PATH)
print("\nMap saved:", MAP_PATH)
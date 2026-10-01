"""Regenerate the vector maps in maps/ from the data in data/.

    python tools/make_maps.py

Writes
    maps/vbmap_na1.svg   editable vector map (text kept as text)
    maps/vbmap_na1.pdf   print version (A3 portrait)
    maps/vbmap_na1.dxf   CAD drawing in OS National Grid metres (needs ezdxf)

Needs matplotlib; ezdxf for the DXF (pip install matplotlib ezdxf).
Sources: data/na1_isopleths_OSGB.geojson (regenerated isopleths, full detail)
         data/na1_isopleths_web.json     (Natural Earth coastline, OS grid km)
"""
import json
import pathlib

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch, Polygon as MplPolygon

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "maps"
OUT.mkdir(exist_ok=True)

ISO = json.loads((ROOT / "data/na1_isopleths_OSGB.geojson").read_text())
LAND = json.loads((ROOT / "data/na1_isopleths_web.json").read_text())["land"]   # km

LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ"


def square(e100, n100):
    l1 = (19 - n100) - (19 - n100) % 5 + (e100 + 10) // 5
    l2 = (19 - n100) * 5 % 25 + e100 % 5
    return LETTERS[l1] + LETTERS[l2]


lines = [f for f in ISO["features"] if f["geometry"]["type"] == "LineString"]
ci = [f for f in ISO["features"] if f["geometry"]["type"] != "LineString"][0]
ci_polys = ci["geometry"]["coordinates"] if ci["geometry"]["type"] == "MultiPolygon" else [ci["geometry"]["coordinates"]]

# ------------------------------------------------------------------ SVG / PDF
INK, HALF, COAST, LANDC, SEA, GRID, GRIDT = "#111111", "#7a7a7a", "#8f9a97", "#f6f5f0", "#ffffff", "#9db4cf", "#7f97b3"
plt.rcParams.update({"svg.fonttype": "none", "pdf.fonttype": 42,
                     "font.family": "DejaVu Sans", "font.size": 8})

fig = plt.figure(figsize=(11.69, 16.54))            # A3 portrait, inches
ax = fig.add_axes([0.06, 0.07, 0.88, 0.86])
ax.set_facecolor(SEA)
X0, X1, Y0, Y1 = -240, 720, -110, 1260
ax.set_xlim(X0, X1); ax.set_ylim(Y0, Y1); ax.set_aspect("equal")

for p in LAND:
    ax.add_patch(MplPolygon(p, closed=True, facecolor=LANDC, edgecolor=COAST, lw=0.4, zorder=1))
for p in ci_polys:
    xy = [(x / 1000, y / 1000) for x, y in p[0]]
    ax.add_patch(MplPolygon(xy, closed=True, facecolor="#e9d6c8", edgecolor="#b5651d", lw=0.6, hatch="////", zorder=2))
ax.annotate("Channel Islands\n24 m/s", xy=(375, -55), xytext=(470, -80), fontsize=8, ha="left", va="center",
            arrowprops=dict(arrowstyle="-", lw=0.5, color="#b5651d"), zorder=6)

# 100 km grid and square letters
for e in range(0, 701, 100):
    ax.plot([e, e], [0, 1300], color=GRID, lw=0.4, zorder=3)
for n in range(0, 1301, 100):
    ax.plot([0, 700], [n, n], color=GRID, lw=0.4, zorder=3)
for e100 in range(7):
    for n100 in range(13):
        if n100 * 100 + 50 < Y1:
            ax.text(e100 * 100 + 50, n100 * 100 + 50, square(e100, n100), color=GRIDT, fontsize=9,
                    ha="center", va="center", alpha=0.75, zorder=3)

# isopleths: half-value hairlines under the labelled lines
for f in sorted(lines, key=lambda f: f["properties"]["vb_map_ms"] % 1 == 0):
    v = f["properties"]["vb_map_ms"]
    xs = [x / 1000 for x, _ in f["geometry"]["coordinates"]]
    ys = [y / 1000 for _, y in f["geometry"]["coordinates"]]
    half = v % 1 != 0
    ax.plot(xs, ys, color=HALF if half else INK, lw=0.45 if half else 1.5, solid_capstyle="round", zorder=4 if half else 5)
    k = int(len(xs) * (0.62 if half else 0.42))
    k = min(max(k, 0), len(xs) - 1)
    if not half or v == 21.5:
        ax.text(xs[k], ys[k], f"{v:g}", fontsize=9 if not half else 7.5, fontweight="bold" if not half else "normal",
                color=INK if not half else "#444", ha="center", va="center", zorder=7,
                bbox=dict(boxstyle="round,pad=0.15", fc=LANDC, ec="none"))

# axes in km, scale bar
ax.set_xticks(range(-200, 701, 100)); ax.set_yticks(range(-100, 1201, 100))
ax.tick_params(labelsize=7, colors="#555", length=3)
ax.set_xlabel("OS Easting (km)", fontsize=8, color="#555"); ax.set_ylabel("OS Northing (km)", fontsize=8, color="#555")
for s in ax.spines.values():
    s.set_color("#999"); s.set_linewidth(0.6)
sx, sy = -210, -80
for i in range(4):
    ax.add_patch(plt.Rectangle((sx + i * 50, sy), 50, 6, facecolor=INK if i % 2 == 0 else "white", edgecolor=INK, lw=0.5, zorder=6))
for i, t in enumerate(["0", "50", "100", "150", "200 km"]):
    ax.text(sx + i * 50, sy + 12, t, fontsize=7, ha="center", zorder=6)

ax.legend(handles=[Line2D([], [], color=INK, lw=1.5, label="Isopleth, whole m/s (labelled)"),
                   Line2D([], [], color=HALF, lw=0.6, label="Isopleth, half value (unlabelled except 21.5)"),
                   Patch(facecolor="#e9d6c8", edgecolor="#b5651d", hatch="////", label="Channel Islands, 24 m/s"),
                   Line2D([], [], color=GRID, lw=0.8, label="OS National Grid, 100 km squares")],
          loc="upper left", fontsize=8, frameon=True, framealpha=0.95, edgecolor="#bbb")

fig.text(0.06, 0.955, "Fundamental basic wind velocity  $v_{b,map}$  (m/s)", fontsize=16, fontweight="bold")
fig.text(0.06, 0.94, "Isopleths regenerated by Format Engineers from Figure NA.1, NA to BS EN 1991-1-4:2005+A1:2010 (© BSI). "
         "Site value  $v_{b,0} = v_{b,map} \\cdot c_{alt}$  (Equation NA.1; $c_{alt}$ from NA.2.5).", fontsize=8.5, color="#333")
fig.text(0.06, 0.038, "Lines within about 1 km of NA.1 in Great Britain and about 6 km in Ireland. Irish Republic isopleths are for "
         "interpolation only (NA.1 NOTE 2).\nCoastline: Natural Earth (public domain). Verify design values against Figure NA.1.",
         fontsize=7, color="#555", va="top", linespacing=1.5)
fig.text(0.94, 0.038, "github.com/formateng/vb_map", fontsize=7, color="#555", ha="right", va="top")

fig.savefig(OUT / "vbmap_na1.svg")
fig.savefig(OUT / "vbmap_na1.pdf")
plt.close(fig)

# ------------------------------------------------------------------ DXF
try:
    import ezdxf
    from ezdxf.enums import TextEntityAlignment
except ImportError:
    print("ezdxf not installed: skipped maps/vbmap_na1.dxf")
else:
    doc = ezdxf.new("R2013"); doc.units = ezdxf.units.M
    msp = doc.modelspace()
    for name, colour in [("ISO_WHOLE", 7), ("ISO_HALF", 8), ("ISO_LABELS", 7), ("CHANNEL_ISLANDS_24", 30),
                         ("OS_GRID_100KM", 5), ("COASTLINE", 9)]:
        doc.layers.add(name, color=colour)
    for f in lines:
        v = f["properties"]["vb_map_ms"]; c = f["geometry"]["coordinates"]; half = v % 1 != 0
        msp.add_lwpolyline(c, close=bool(f["properties"]["closed"]), dxfattribs={"layer": "ISO_HALF" if half else "ISO_WHOLE"})
        if not half or v == 21.5:
            x, y = c[int(len(c) * (0.62 if half else 0.42))]
            msp.add_text(f"{v:g}", height=6000, dxfattribs={"layer": "ISO_LABELS"}).set_placement(
                (x, y), align=TextEntityAlignment.MIDDLE_CENTER)
    for p in ci_polys:
        msp.add_lwpolyline(p[0], close=True, dxfattribs={"layer": "CHANNEL_ISLANDS_24"})
    for e in range(0, 700001, 100000):
        msp.add_line((e, 0), (e, 1300000), dxfattribs={"layer": "OS_GRID_100KM"})
    for n in range(0, 1300001, 100000):
        msp.add_line((0, n), (700000, n), dxfattribs={"layer": "OS_GRID_100KM"})
    for e100 in range(7):
        for n100 in range(13):
            msp.add_text(square(e100, n100), height=12000, dxfattribs={"layer": "OS_GRID_100KM"}).set_placement(
                (e100 * 1e5 + 5e4, n100 * 1e5 + 5e4), align=TextEntityAlignment.MIDDLE_CENTER)
    for p in LAND:
        msp.add_lwpolyline([(x * 1000, y * 1000) for x, y in p], close=True, dxfattribs={"layer": "COASTLINE"})
    doc.saveas(OUT / "vbmap_na1.dxf")

print("maps written:", ", ".join(sorted(p.name for p in OUT.iterdir())))

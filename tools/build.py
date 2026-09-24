"""Assemble the single-file site: src/page.html + src/*.js + data/*.json -> index.html

    python tools/build.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
page = (ROOT / "src/page.html").read_text()
page = (page.replace("/*DATA*/", "const DATA=" + (ROOT / "data/na1_isopleths_web.json").read_text().strip() + ";")
            .replace("/*OSGB*/", (ROOT / "src/osgb.js").read_text())
            .replace("/*CORE*/", (ROOT / "src/core.js").read_text()))
head, rest = page.split("</style>", 1)
html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + head + "</style>\n</head>\n<body>\n" + rest + "\n</body>\n</html>\n")
(ROOT / "index.html").write_text(html)
print(f"index.html written ({len(html) // 1024} KB)")

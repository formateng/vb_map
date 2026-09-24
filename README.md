# vb,map Lookup

A static web page that reads the fundamental basic wind velocity **v<sub>b,map</sub>** (m/s, before the altitude correction) from digitised isopleths of **Figure NA.1, NA to BS EN 1991-1-4:2005+A1:2010**.

Click the map, or enter a grid reference (`TQ 32500 80500`), Easting/Northing in metres (`532500, 180500`), latitude/longitude (`51.508, -0.088`) or a postcode. The page shows the value, the two isopleths it lies between and the distance to each, and flags cases that need care.

Everything runs in the browser. `index.html` is a single self-contained file (~105 KB): no server, no build step needed to host it.

## Publish with GitHub Pages

1. Create a repository and push this folder (see *Licence and data* below before making it public).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`.

## Repository layout

```
index.html                    built site (commit this; it is what Pages serves)
src/page.html                 page layout, styles and UI script (placeholders for data and libraries)
src/core.js                   vb,map calculation (proportional-distance interpolation)
src/osgb.js                   WGS84 <-> OS National Grid, grid references
data/na1_isopleths_web.json   isopleths, Channel Islands and coastline, OS grid km
tools/build.py                rebuilds index.html from src/ and data/
tests/core.test.mjs           checks against reference values from the Python tool
.github/workflows/test.yml    runs the tests and checks index.html is rebuilt
```

After editing anything in `src/` or `data/`:

```
python tools/build.py                 # rewrites index.html
node --test tests/core.test.mjs       # Node 18+
```

## Method

Isopleths: labelled lines every 1 m/s from 22 to 31 and the unlabelled 0.5 m/s hairlines from 21.5 to 30.5, digitised from the published figure. They lie within about 1 km of NA.1 in Great Britain and about 6 km in the Irish inset. For the web they are simplified to a 120 m tolerance.

At a site the two bracketing isopleths are found and v = v1 + (v2 − v1) · d1 / (d1 + d2), with d1, d2 the shortest distances to each. Inside the 21.5 m/s ring the value is 21.5; beyond the 31 m/s line it is held at 31; Channel Islands sites take 24 m/s from the note on the figure. The same method is in the Python package `vbmap-na1`; results agree to 0.01 m/s.

Latitude/longitude uses a 7-parameter Helmert transform (a few metres); postcodes are looked up at postcodes.io, which returns OS grid coordinates.

## Use and limits

A checking and screening tool. Verify design values against Figure NA.1 itself and apply c<sub>alt</sub> (NA.2.5) and the other National Annex factors.

## Licence and data

The code can take any licence you choose. The isopleth data is derived from a BSI copyright figure. Check the licence terms of your copy of the standard before making this repository or its Pages site public; a private repository or an internal host avoids publishing the data.

Built 24 Sep 2026 · Format Engineers.

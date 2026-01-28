# Seismic Dashboard (USGS + CSV)

This folder contains a lightweight, no-build dashboard that can:
- Fetch earthquake CSV data from the USGS search API (user-defined time range, magnitude, depth)
- Load local CSV files downloaded from https://earthquake.usgs.gov/earthquakes/search/
- Optionally load the included `query.csv` sample

The dashboard renders:
- Map of events (lat/lon), sized by magnitude and colored by depth
- OpenStreetMap base tiles + tectonic lineaments overlay (GeoJSON)
- Events over time (day/week/month)
- Magnitude histogram
- Depth vs magnitude scatter
- Filterable table + export filtered CSV

## Run

1) Start a local server from this directory:

```powershell
python -m http.server 8000
```

2) Open:

```text
http://localhost:8000
```

Then click **Fetch & Load** (USGS) or **Upload CSV** (local).  
If the **Myanmar only** toggle in the USGS section is on, the USGS query includes a Myanmar bounding box.

If you open `index.html` directly (file://), browsers often block `fetch("query.csv")`.
In that case, use **Upload CSV** and select a file manually.

## Files

- `index.html` - page layout
- `styles.css` - styling
- `app.js` - parsing, filtering, and Plotly charts
- `query.csv` - optional sample data (if present)

## Notes

- The provided `query.csv` appears to contain extra sparse columns and embedded summary rows. The dashboard keeps only rows that look like real events (valid `time`, `latitude`, `longitude`, `mag`).
- Libraries are loaded via CDN: Plotly + PapaParse + Leaflet. If you need an offline version, tell me and I can vendor the minified JS locally.
- GitHub Pages: this is a static site, so you can publish the whole folder as-is.

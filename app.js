/* global Papa, Plotly, L */

const BASE_COLUMNS = [
  "time",
  "latitude",
  "longitude",
  "depth",
  "mag",
  "magType",
  "nst",
  "gap",
  "dmin",
  "rms",
  "id",
  "updated",
  "place",
  "type",
  "status",
];

const els = {
  btnLoad: document.getElementById("btnLoad"),
  fileInput: document.getElementById("fileInput"),
  dataStatus: document.getElementById("dataStatus"),

  kpiEvents: document.getElementById("kpiEvents"),
  kpiEventsSub: document.getElementById("kpiEventsSub"),
  kpiMaxMag: document.getElementById("kpiMaxMag"),
  kpiMaxMagSub: document.getElementById("kpiMaxMagSub"),
  kpiDeepest: document.getElementById("kpiDeepest"),
  kpiDeepestSub: document.getElementById("kpiDeepestSub"),
  kpiRange: document.getElementById("kpiRange"),
  kpiRangeSub: document.getElementById("kpiRangeSub"),

  dateStart: document.getElementById("dateStart"),
  dateEnd: document.getElementById("dateEnd"),
  magMin: document.getElementById("magMin"),
  magMax: document.getElementById("magMax"),
  depthMin: document.getElementById("depthMin"),
  depthMax: document.getElementById("depthMax"),
  placeSearch: document.getElementById("placeSearch"),
  statusSel: document.getElementById("statusSel"),
  myanmarOnly: document.getElementById("myanmarOnly"),
  magTypeSel: document.getElementById("magTypeSel"),
  bucketSel: document.getElementById("bucketSel"),
  btnReset: document.getElementById("btnReset"),
  btnExport: document.getElementById("btnExport"),
  filterStatus: document.getElementById("filterStatus"),

  usgsStart: document.getElementById("usgsStart"),
  usgsEnd: document.getElementById("usgsEnd"),
  usgsMinMag: document.getElementById("usgsMinMag"),
  usgsMaxMag: document.getElementById("usgsMaxMag"),
  usgsMinDepth: document.getElementById("usgsMinDepth"),
  usgsMaxDepth: document.getElementById("usgsMaxDepth"),
  usgsMyanmarOnly: document.getElementById("usgsMyanmarOnly"),
  usgsFetch: document.getElementById("usgsFetch"),
  usgsDownload: document.getElementById("usgsDownload"),
  usgsStatus: document.getElementById("usgsStatus"),

  chartMap: document.getElementById("chartMap"),
  chartTime: document.getElementById("chartTime"),
  chartHist: document.getElementById("chartHist"),
  chartScatter: document.getElementById("chartScatter"),
  eventsTbody: document.getElementById("eventsTbody"),
};

const TECTONIC_URL =
  "https://raw.githubusercontent.com/drtinkooo/myanmar-earthquake-archive/main/Myanmar_Tectonic_Map_2011.geojson";
const USGS_API_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const MYANMAR_BBOX = {
  minLat: 9.5,
  maxLat: 28.7,
  minLon: 92.0,
  maxLon: 101.2,
};

let mapInstance = null;
let quakeLayer = null;
let tectonicLayer = null;

function fmtNumber(x, digits = 1) {
  if (!Number.isFinite(x)) return "-";
  return x.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function fmtInt(x) {
  if (!Number.isFinite(x)) return "-";
  return x.toLocaleString();
}

function fmtDateYMD(d) {
  // UTC date string for <input type="date">
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtUtcTimestamp(d) {
  // Keep readable and stable (no locale surprises).
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

function ymdToUtcMs(ymd) {
  return Date.parse(`${ymd}T00:00:00Z`);
}

function parseFloatOrNull(v) {
  const x = Number.parseFloat(v);
  return Number.isFinite(x) ? x : null;
}

function parseDateOrNull(v) {
  if (typeof v !== "string" || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr)).sort();
}

function isLikelyEventRow(row) {
  // Some exports can contain summary tables; we keep only rows that look like actual events.
  if (!row) return false;
  const t = parseDateOrNull(row.time);
  if (!t) return false;
  const lat = parseFloatOrNull(row.latitude);
  const lon = parseFloatOrNull(row.longitude);
  const mag = parseFloatOrNull(row.mag);
  return (
    lat !== null &&
    lon !== null &&
    mag !== null &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

function normalizeRow(row) {
  const out = {};
  for (const k of BASE_COLUMNS) out[k] = row[k] ?? "";
  const t = parseDateOrNull(out.time);
  if (!t) return null;
  const lat = parseFloatOrNull(out.latitude);
  const lon = parseFloatOrNull(out.longitude);
  const depth = parseFloatOrNull(out.depth);
  const mag = parseFloatOrNull(out.mag);
  if (lat === null || lon === null || mag === null) return null;

  return {
    time: t,
    timeMs: t.getTime(),
    timeLabel: fmtUtcTimestamp(t),
    dateYmd: fmtDateYMD(t),
    monthKey: `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`,
    latitude: lat,
    longitude: lon,
    depthKm: depth ?? null,
    mag,
    magType: String(out.magType || "").trim() || "unknown",
    nst: parseFloatOrNull(out.nst),
    gap: parseFloatOrNull(out.gap),
    dmin: parseFloatOrNull(out.dmin),
    rms: parseFloatOrNull(out.rms),
    id: String(out.id || "").trim(),
    updatedRaw: String(out.updated || "").trim(),
    place: String(out.place || "").trim(),
    type: String(out.type || "").trim(),
    status: String(out.status || "").trim() || "unknown",
  };
}

function parseCsvText(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  if (parsed.errors && parsed.errors.length) {
    // Keep going; we expect some messy export columns.
    console.warn("CSV parse warnings:", parsed.errors.slice(0, 5));
  }

  const rawRows = parsed.data || [];
  const events = [];
  for (const r of rawRows) {
    if (!isLikelyEventRow(r)) continue;
    const ev = normalizeRow(r);
    if (ev) events.push(ev);
  }

  // Ensure stable ordering: newest first for table; charts can sort as needed.
  events.sort((a, b) => b.timeMs - a.timeMs);
  return events;
}

function computeExtents(events) {
  const times = events.map((e) => e.timeMs);
  const mags = events.map((e) => e.mag);
  const depths = events.map((e) => (e.depthKm === null ? NaN : e.depthKm));

  const minTime = new Date(Math.min(...times));
  const maxTime = new Date(Math.max(...times));
  const minMag = Math.min(...mags);
  const maxMag = Math.max(...mags);

  const finiteDepths = depths.filter((d) => Number.isFinite(d));
  const minDepth = finiteDepths.length ? Math.min(...finiteDepths) : 0;
  const maxDepth = finiteDepths.length ? Math.max(...finiteDepths) : 0;

  return {
    minDate: minTime,
    maxDate: maxTime,
    minMag,
    maxMag,
    minDepth,
    maxDepth,
  };
}

function defaultFilters(ext) {
  return {
    startDateYmd: fmtDateYMD(ext.minDate),
    endDateYmd: fmtDateYMD(ext.maxDate),
    magMin: Math.floor(ext.minMag * 10) / 10,
    magMax: Math.ceil(ext.maxMag * 10) / 10,
    depthMin: Math.floor(ext.minDepth),
    depthMax: Math.ceil(ext.maxDepth),
    placeSearch: "",
    status: "all",
    myanmarOnly: false,
    magType: "all",
    bucket: "day",
  };
}

function applyFilters(events, f) {
  const startMs = new Date(`${f.startDateYmd}T00:00:00Z`).getTime();
  const endMs = new Date(`${f.endDateYmd}T23:59:59Z`).getTime();
  const q = f.placeSearch.trim().toLowerCase();

  return events.filter((e) => {
    if (e.timeMs < startMs || e.timeMs > endMs) return false;
    if (e.mag < f.magMin || e.mag > f.magMax) return false;

    if (Number.isFinite(f.depthMin) && e.depthKm !== null && e.depthKm < f.depthMin) return false;
    if (Number.isFinite(f.depthMax) && e.depthKm !== null && e.depthKm > f.depthMax) return false;

    if (q && !e.place.toLowerCase().includes(q)) return false;
    if (f.status !== "all" && e.status !== f.status) return false;
    if (f.myanmarOnly && !isInMyanmar(e)) return false;
    if (f.magType !== "all" && e.magType !== f.magType) return false;
    return true;
  });
}

function isInMyanmar(e) {
  const inBox =
    e.latitude >= MYANMAR_BBOX.minLat &&
    e.latitude <= MYANMAR_BBOX.maxLat &&
    e.longitude >= MYANMAR_BBOX.minLon &&
    e.longitude <= MYANMAR_BBOX.maxLon;

  if (inBox) return true;
  const place = (e.place || "").toLowerCase();
  return place.includes("myanmar") || place.includes("burma");
}

function setStatus(msg) {
  els.dataStatus.textContent = msg;
}

function setFilterStatus(msg) {
  els.filterStatus.textContent = msg;
}

function setUsgsStatus(msg) {
  if (els.usgsStatus) els.usgsStatus.textContent = msg;
}

function initUsgsDefaults() {
  if (!els.usgsStart || !els.usgsEnd) return;
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (!els.usgsStart.value) els.usgsStart.value = fmtDateYMD(start);
  if (!els.usgsEnd.value) els.usgsEnd.value = fmtDateYMD(end);
  if (!els.usgsMinMag.value) els.usgsMinMag.value = "4.0";
}

function readUsgsFilters() {
  return {
    start: els.usgsStart.value,
    end: els.usgsEnd.value,
    minMag: parseFloatOrNull(els.usgsMinMag.value),
    maxMag: parseFloatOrNull(els.usgsMaxMag.value),
    minDepth: parseFloatOrNull(els.usgsMinDepth.value),
    maxDepth: parseFloatOrNull(els.usgsMaxDepth.value),
    myanmarOnly: !!els.usgsMyanmarOnly?.checked,
  };
}

function validateUsgsFilters(f) {
  if (!f.start || !f.end) {
    return { ok: false, message: "Start and end dates are required." };
  }
  const startMs = ymdToUtcMs(f.start);
  const endMs = ymdToUtcMs(f.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { ok: false, message: "Invalid date format." };
  }
  if (startMs > endMs) {
    return { ok: false, message: "Start date must be on or before end date." };
  }
  if (f.minMag !== null && f.maxMag !== null && f.minMag > f.maxMag) {
    return { ok: false, message: "Min magnitude must be <= max magnitude." };
  }
  if (f.minDepth !== null && f.maxDepth !== null && f.minDepth > f.maxDepth) {
    return { ok: false, message: "Min depth must be <= max depth." };
  }
  return { ok: true };
}

function buildUsgsUrl(f) {
  const params = new URLSearchParams();
  params.set("format", "csv");
  params.set("eventtype", "earthquake");
  params.set("orderby", "time");
  params.set("starttime", f.start);
  params.set("endtime", f.end);

  if (f.minMag !== null) params.set("minmagnitude", String(f.minMag));
  if (f.maxMag !== null) params.set("maxmagnitude", String(f.maxMag));
  if (f.minDepth !== null) params.set("mindepth", String(f.minDepth));
  if (f.maxDepth !== null) params.set("maxdepth", String(f.maxDepth));
  if (f.myanmarOnly) {
    params.set("minlatitude", String(MYANMAR_BBOX.minLat));
    params.set("maxlatitude", String(MYANMAR_BBOX.maxLat));
    params.set("minlongitude", String(MYANMAR_BBOX.minLon));
    params.set("maxlongitude", String(MYANMAR_BBOX.maxLon));
  }

  return `${USGS_API_URL}?${params.toString()}`;
}

function safePlotlyConfig() {
  return {
    displayModeBar: true,
    responsive: true,
    toImageButtonOptions: {
      format: "png",
      filename: "seismic-dashboard",
      scale: 2,
    },
  };
}

function plotBaseLayout(title) {
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 44, r: 18, t: 10, b: 42 },
    font: { color: "#f2f5ff", family: "Space Grotesk, system-ui, sans-serif" },
    title: { text: title || "", font: { size: 12, family: "IBM Plex Mono, monospace" } },
  };
}

function depthToColor(depthKm, minDepth, maxDepth) {
  if (!Number.isFinite(depthKm)) return "#9fb3c8";
  const tRaw = (depthKm - minDepth) / Math.max(1, maxDepth - minDepth);
  const t = clamp(tRaw, 0, 1);
  // Gradient from cool blue to warm orange.
  const r = Math.round(40 + t * 200);
  const g = Math.round(120 + t * 60);
  const b = Math.round(220 - t * 140);
  return `rgb(${r},${g},${b})`;
}

function renderKpis(allEvents, filtered) {
  els.kpiEvents.textContent = fmtInt(filtered.length);
  els.kpiEventsSub.textContent = `${fmtInt(allEvents.length)} total`;

  if (!filtered.length) {
    els.kpiMaxMag.textContent = "-";
    els.kpiMaxMagSub.textContent = "-";
    els.kpiDeepest.textContent = "-";
    els.kpiDeepestSub.textContent = "-";
    els.kpiRange.textContent = "-";
    els.kpiRangeSub.textContent = "-";
    return;
  }

  const maxMagEv = filtered.reduce((a, b) => (b.mag > a.mag ? b : a), filtered[0]);
  els.kpiMaxMag.textContent = fmtNumber(maxMagEv.mag, 1);
  els.kpiMaxMagSub.textContent = maxMagEv.place || maxMagEv.timeLabel;

  const withDepth = filtered.filter((e) => Number.isFinite(e.depthKm));
  if (withDepth.length) {
    const deepest = withDepth.reduce((a, b) => (b.depthKm > a.depthKm ? b : a), withDepth[0]);
    els.kpiDeepest.textContent = fmtNumber(deepest.depthKm, 0);
    els.kpiDeepestSub.textContent = deepest.place || deepest.timeLabel;
  } else {
    els.kpiDeepest.textContent = "-";
    els.kpiDeepestSub.textContent = "No depth values";
  }

  const minT = filtered.reduce((m, e) => Math.min(m, e.timeMs), filtered[0].timeMs);
  const maxT = filtered.reduce((m, e) => Math.max(m, e.timeMs), filtered[0].timeMs);
  const minD = new Date(minT);
  const maxD = new Date(maxT);
  els.kpiRange.textContent = `${fmtDateYMD(minD)} to ${fmtDateYMD(maxD)}`;
  els.kpiRangeSub.textContent = `${fmtUtcTimestamp(minD)} - ${fmtUtcTimestamp(maxD)}`;
}

function bucketKey(d, bucket) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-based
  const day = d.getUTCDate();

  if (bucket === "month") {
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }

  if (bucket === "week") {
    // Week starting Monday in UTC.
    const tmp = new Date(Date.UTC(y, m, day));
    const dow = (tmp.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
    tmp.setUTCDate(tmp.getUTCDate() - dow);
    return fmtDateYMD(tmp);
  }

  // day
  return fmtDateYMD(d);
}

function summarizeByBucket(events, bucket) {
  const counts = new Map();
  for (const e of events) {
    const k = bucketKey(e.time, bucket);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const keys = Array.from(counts.keys()).sort();
  return { x: keys, y: keys.map((k) => counts.get(k)) };
}

function renderCharts(filtered, bucket) {
  const mags = filtered.map((e) => e.mag);
  // Events over time
  const series = summarizeByBucket(filtered, bucket);
  Plotly.react(
    els.chartTime,
    [
      {
        type: "bar",
        x: series.x,
        y: series.y,
        marker: {
          color: "rgba(255,207,90,.70)",
          line: { color: "rgba(255,255,255,.18)", width: 1 },
        },
        hovertemplate: "%{x}<br>Events: %{y}<extra></extra>",
      },
    ],
    {
      ...plotBaseLayout(),
      xaxis: {
        gridcolor: "rgba(39,48,83,.55)",
        tickfont: { family: "IBM Plex Mono, monospace" },
      },
      yaxis: {
        gridcolor: "rgba(39,48,83,.55)",
        tickfont: { family: "IBM Plex Mono, monospace" },
        rangemode: "tozero",
      },
    },
    safePlotlyConfig()
  );

  // Magnitude histogram
  Plotly.react(
    els.chartHist,
    [
      {
        type: "histogram",
        x: mags,
        nbinsx: 16,
        marker: {
          color: "rgba(106,215,255,.70)",
          line: { color: "rgba(255,255,255,.18)", width: 1 },
        },
        hovertemplate: "Mag bin: %{x}<br>Count: %{y}<extra></extra>",
      },
    ],
    {
      ...plotBaseLayout(),
      xaxis: { title: { text: "Magnitude" }, gridcolor: "rgba(39,48,83,.55)" },
      yaxis: { title: { text: "Count" }, gridcolor: "rgba(39,48,83,.55)", rangemode: "tozero" },
    },
    safePlotlyConfig()
  );

  // Depth vs magnitude scatter
  const scatterX = [];
  const scatterY = [];
  const scatterText = [];
  for (const e of filtered) {
    if (!Number.isFinite(e.depthKm)) continue;
    scatterX.push(e.mag);
    scatterY.push(e.depthKm);
    scatterText.push(`${e.timeLabel}<br>${escapeHtml(e.place)}`);
  }

  Plotly.react(
    els.chartScatter,
    [
      {
        type: "scatter",
        mode: "markers",
        x: scatterX,
        y: scatterY,
        text: scatterText,
        hovertemplate: "Mag %{x}<br>Depth %{y} km<br>%{text}<extra></extra>",
        marker: {
          size: scatterX.map((m) => clamp(6 + (m - 3) * 4, 6, 22)),
          color: scatterX,
          colorscale: "Viridis",
          opacity: 0.85,
          line: { color: "rgba(255,255,255,.18)", width: 1 },
        },
      },
    ],
    {
      ...plotBaseLayout(),
      xaxis: { title: { text: "Magnitude" }, gridcolor: "rgba(39,48,83,.55)" },
      yaxis: {
        title: { text: "Depth (km)" },
        gridcolor: "rgba(39,48,83,.55)",
        autorange: "reversed", // deeper is down
      },
    },
    safePlotlyConfig()
  );
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderTable(filtered) {
  const rows = filtered.slice(0, 100);
  els.eventsTbody.innerHTML = rows
    .map((e) => {
      const depthTxt = e.depthKm === null ? "-" : fmtNumber(e.depthKm, 1);
      return (
        "<tr>" +
        `<td class="mono">${e.timeLabel}</td>` +
        `<td class="num">${fmtNumber(e.mag, 1)}</td>` +
        `<td class="num">${depthTxt}</td>` +
        `<td>${escapeHtml(e.place)}</td>` +
        `<td class="mono">${escapeHtml(e.status)}</td>` +
        "</tr>"
      );
    })
    .join("");
}

function initLeafletMap() {
  if (mapInstance) return;

  mapInstance = L.map(els.chartMap, {
    zoomControl: true,
    attributionControl: true,
  }).setView([20, 95], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mapInstance);

  quakeLayer = L.layerGroup().addTo(mapInstance);

  // Ensure correct sizing after layout/animation.
  setTimeout(() => {
    mapInstance.invalidateSize();
  }, 200);

  fetch(TECTONIC_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((geojson) => {
      tectonicLayer = L.geoJSON(geojson, {
        style: {
          color: "#ff6a8d",
          weight: 2,
          opacity: 0.8,
        },
      }).addTo(mapInstance);
    })
    .catch((err) => {
      console.warn("Tectonic layer failed to load:", err);
    });
}

function renderMap(filtered, ext) {
  if (!mapInstance || !quakeLayer) return;
  quakeLayer.clearLayers();
  if (!filtered.length) return;

  const bounds = [];
  for (const e of filtered) {
    const radius = clamp(4 + (e.mag - 3) * 4, 4, 18);
    const color = depthToColor(e.depthKm, ext.minDepth, ext.maxDepth);

    const marker = L.circleMarker([e.latitude, e.longitude], {
      radius,
      color,
      fillColor: color,
      fillOpacity: 0.75,
      weight: 1,
    });
    marker.bindPopup(
      `<div style="font-family: var(--mono); font-size: 12px;">` +
        `<div><b>M ${fmtNumber(e.mag, 1)}</b> (${escapeHtml(e.magType)})</div>` +
        `<div>Depth: ${e.depthKm === null ? "?" : fmtNumber(e.depthKm, 1)} km</div>` +
        `<div>${escapeHtml(e.place)}</div>` +
        `<div>${escapeHtml(e.timeLabel)}</div>` +
      `</div>`
    );
    marker.addTo(quakeLayer);
    bounds.push([e.latitude, e.longitude]);
  }

  if (bounds.length) {
    mapInstance.fitBounds(bounds, { padding: [20, 20], maxZoom: 7 });
  }
}

function setFiltersUi(f, ext, magTypes) {
  els.dateStart.min = fmtDateYMD(ext.minDate);
  els.dateStart.max = fmtDateYMD(ext.maxDate);
  els.dateEnd.min = fmtDateYMD(ext.minDate);
  els.dateEnd.max = fmtDateYMD(ext.maxDate);

  els.dateStart.value = f.startDateYmd;
  els.dateEnd.value = f.endDateYmd;
  els.magMin.value = f.magMin;
  els.magMax.value = f.magMax;
  els.depthMin.value = f.depthMin;
  els.depthMax.value = f.depthMax;
  els.placeSearch.value = f.placeSearch;
  els.statusSel.value = f.status;
  if (els.myanmarOnly) els.myanmarOnly.checked = !!f.myanmarOnly;
  els.bucketSel.value = f.bucket;

  // Populate mag types fresh per dataset.
  els.magTypeSel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = "All";
  els.magTypeSel.appendChild(optAll);
  for (const mt of magTypes) {
    const opt = document.createElement("option");
    opt.value = mt;
    opt.textContent = mt;
    els.magTypeSel.appendChild(opt);
  }
  els.magTypeSel.value = magTypes.includes(f.magType) ? f.magType : "all";
}

function readFiltersFromUi(ext) {
  const start = els.dateStart.value || fmtDateYMD(ext.minDate);
  const end = els.dateEnd.value || fmtDateYMD(ext.maxDate);

  const magMin = Number.parseFloat(els.magMin.value);
  const magMax = Number.parseFloat(els.magMax.value);
  const depthMin = Number.parseFloat(els.depthMin.value);
  const depthMax = Number.parseFloat(els.depthMax.value);

  return {
    startDateYmd: start,
    endDateYmd: end,
    magMin: Number.isFinite(magMin) ? magMin : Math.floor(ext.minMag * 10) / 10,
    magMax: Number.isFinite(magMax) ? magMax : Math.ceil(ext.maxMag * 10) / 10,
    depthMin: Number.isFinite(depthMin) ? depthMin : Math.floor(ext.minDepth),
    depthMax: Number.isFinite(depthMax) ? depthMax : Math.ceil(ext.maxDepth),
    placeSearch: els.placeSearch.value || "",
    status: els.statusSel.value || "all",
    myanmarOnly: !!els.myanmarOnly?.checked,
    magType: els.magTypeSel.value || "all",
    bucket: els.bucketSel.value || "day",
  };
}

function exportFilteredCsv(filtered) {
  const cols = [
    "time_utc",
    "latitude",
    "longitude",
    "depth_km",
    "mag",
    "magType",
    "place",
    "status",
    "id",
  ];
  const lines = [cols.join(",")];
  for (const e of filtered) {
    const row = [
      new Date(e.timeMs).toISOString(),
      e.latitude,
      e.longitude,
      e.depthKm === null ? "" : e.depthKm,
      e.mag,
      e.magType,
      csvEscape(e.place),
      csvEscape(e.status),
      csvEscape(e.id),
    ];
    lines.push(row.join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "filtered_events.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(s) {
  const v = String(s ?? "");
  if (/[,"\n\r]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

function wireUi(onChange) {
  const inputs = [
    els.dateStart,
    els.dateEnd,
    els.magMin,
    els.magMax,
    els.depthMin,
    els.depthMax,
    els.placeSearch,
    els.statusSel,
    els.myanmarOnly,
    els.magTypeSel,
    els.bucketSel,
  ];
  for (const el of inputs) {
    el.addEventListener("input", onChange);
    el.addEventListener("change", onChange);
  }
}

async function loadFromFetch() {
  const res = await fetch("query.csv", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function fetchUsgsCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function downloadCsvFromUrl(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}

function loadFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function setFilterControlsEnabled(enabled) {
  const ctrls = [
    els.dateStart,
    els.dateEnd,
    els.magMin,
    els.magMax,
    els.depthMin,
    els.depthMax,
    els.placeSearch,
    els.statusSel,
    els.myanmarOnly,
    els.magTypeSel,
    els.bucketSel,
    els.btnReset,
    els.btnExport,
  ];
  for (const c of ctrls) c.disabled = !enabled;
}

function initEmptyCharts() {
  Plotly.newPlot(els.chartTime, [], plotBaseLayout(), safePlotlyConfig());
  Plotly.newPlot(els.chartHist, [], plotBaseLayout(), safePlotlyConfig());
  Plotly.newPlot(els.chartScatter, [], plotBaseLayout(), safePlotlyConfig());
}

function main() {
  setFilterControlsEnabled(false);
  initEmptyCharts();
  initLeafletMap();
  initUsgsDefaults();

  let allEvents = [];
  let ext = null;
  let defaultF = null;
  let magTypes = [];

  function rerender() {
    if (!allEvents.length || !ext) return;

    let f = readFiltersFromUi(ext);
    // Keep sane bounds even if user types nonsense.
    f.magMin = clamp(f.magMin, ext.minMag, ext.maxMag);
    f.magMax = clamp(f.magMax, ext.minMag, ext.maxMag);
    if (f.magMin > f.magMax) [f.magMin, f.magMax] = [f.magMax, f.magMin];

    f.depthMin = clamp(f.depthMin, ext.minDepth, ext.maxDepth);
    f.depthMax = clamp(f.depthMax, ext.minDepth, ext.maxDepth);
    if (f.depthMin > f.depthMax) [f.depthMin, f.depthMax] = [f.depthMax, f.depthMin];

    const filtered = applyFilters(allEvents, f);
    renderKpis(allEvents, filtered);
    renderMap(filtered, ext);
    renderCharts(filtered, f.bucket);
    renderTable(filtered);
    setFilterStatus(
      `${fmtInt(filtered.length)} / ${fmtInt(allEvents.length)} events shown`
    );
  }

  async function ingestCsvText(csvText, sourceLabel) {
    setStatus(`Parsing ${sourceLabel}...`);
    const events = parseCsvText(csvText);
    if (!events.length) {
      setStatus(`No events found in ${sourceLabel}.`);
      setFilterStatus("No valid event rows found (check CSV format).");
      return 0;
    }

    allEvents = events;
    ext = computeExtents(allEvents);
    defaultF = defaultFilters(ext);
    magTypes = uniqueSorted(allEvents.map((e) => e.magType)).filter((s) => s && s !== "unknown");

    setFiltersUi(defaultF, ext, magTypes);
    setFilterControlsEnabled(true);
    setStatus(
      `Loaded ${fmtInt(allEvents.length)} events from ${sourceLabel} (${fmtDateYMD(
        ext.minDate
      )} to ${fmtDateYMD(ext.maxDate)}).`
    );
    rerender();
    return allEvents.length;
  }

  wireUi(rerender);

  if (els.usgsFetch) {
    els.usgsFetch.addEventListener("click", async () => {
      const f = readUsgsFilters();
      const validation = validateUsgsFilters(f);
      if (!validation.ok) {
        setUsgsStatus(validation.message);
        return;
      }

      const url = buildUsgsUrl(f);
      setUsgsStatus("Downloading from USGS...");
      try {
        const csvText = await fetchUsgsCsv(url);
        const count = await ingestCsvText(csvText, "USGS");
        if (count) {
          setUsgsStatus(`Loaded ${fmtInt(count)} events from USGS.`);
        } else {
          setUsgsStatus("No events found for that query.");
        }
      } catch (err) {
        console.error(err);
        setUsgsStatus(`USGS download failed: ${err.message || String(err)}`);
      }
    });
  }

  if (els.usgsDownload) {
    els.usgsDownload.addEventListener("click", async () => {
      const f = readUsgsFilters();
      const validation = validateUsgsFilters(f);
      if (!validation.ok) {
        setUsgsStatus(validation.message);
        return;
      }

      const url = buildUsgsUrl(f);
      const filename = `usgs_${f.start}_to_${f.end}.csv`;
      setUsgsStatus("Preparing CSV download...");
      try {
        await downloadCsvFromUrl(url, filename);
        setUsgsStatus(`CSV downloaded: ${filename}`);
      } catch (err) {
        console.error(err);
        setUsgsStatus("Download failed; opening USGS CSV in a new tab.");
        window.open(url, "_blank", "noopener");
      }
    });
  }

  els.btnReset.addEventListener("click", () => {
    if (!defaultF || !ext) return;
    setFiltersUi(defaultF, ext, magTypes);
    rerender();
  });

  els.btnExport.addEventListener("click", () => {
    if (!allEvents.length || !ext) return;
    const f = readFiltersFromUi(ext);
    const filtered = applyFilters(allEvents, f);
    exportFilteredCsv(filtered);
  });

  els.fileInput.addEventListener("change", async () => {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (!file) return;
    try {
      const txt = await loadFromFile(file);
      await ingestCsvText(txt, file.name);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to load file: ${err.message || String(err)}`);
    }
  });

  els.btnLoad.addEventListener("click", async () => {
    try {
      const txt = await loadFromFetch();
      await ingestCsvText(txt, "query.csv");
    } catch (err) {
      // Most common cause: opening index.html via file:// (no fetch), or missing server.
      console.warn(err);
      setStatus(
        "Could not fetch query.csv. Use a local server (see documentation) or click Upload CSV."
      );
    }
  });
}

main();

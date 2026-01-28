# Myanmar Seismic Hub

A comprehensive, no-build interactive dashboard for visualizing and analyzing earthquake data from Myanmar and surrounding regions. This lightweight web application fetches real-time data from the USGS earthquake API or loads local CSV files for in-depth seismic analysis.

![Dashboard Type](https://img.shields.io/badge/Type-Static%20Web%20App-blue)
![No Build Required](https://img.shields.io/badge/Build-None%20Required-green)
![Dependencies](https://img.shields.io/badge/Dependencies-CDN%20Only-orange)

## Features

### Data Sources
- **USGS API Integration**: Fetch earthquake data directly from the USGS FDSNWS Event API with custom parameters
- **Local CSV Upload**: Load earthquake CSV files downloaded from the [USGS Earthquake Search](https://earthquake.usgs.gov/earthquakes/search/)
- **Sample Data**: Quick-load included `query.csv` sample data for testing and demonstration

### Visualizations

#### 1. Interactive Map
- **Base Layer**: OpenStreetMap tiles with custom dark theme styling
- **Tectonic Overlay**: Myanmar tectonic lineaments from GeoJSON data
- **Event Markers**: Circle markers sized by magnitude and colored by depth
- **Popups**: Detailed event information including magnitude, depth, location, and timestamp
- **Auto-fit**: Automatically adjusts zoom and bounds to display all filtered events

#### 2. Events Over Time Chart
- Bar chart showing earthquake frequency over time
- Configurable time buckets: Day, Week, or Month
- Interactive hover tooltips with event counts
- Dynamic adjustment based on applied filters

#### 3. Magnitude Distribution Histogram
- 16-bin histogram showing magnitude distribution
- Color-coded bars with hover information
- Helps identify common magnitude ranges in the dataset

#### 4. Depth vs Magnitude Scatter Plot
- 2D scatter plot correlating depth and magnitude
- Marker size scales with magnitude
- Color gradient (Viridis colorscale) for visual magnitude distinction
- Reversed Y-axis (deeper events appear lower)
- Hover tooltips with event details

#### 5. Events Table
- Displays top 100 most recent events
- Sortable columns: Time (UTC), Magnitude, Depth, Place, Status
- Monospace font for numeric data readability
- Responsive hover effects

### Key Performance Indicators (KPIs)
- **Events Count**: Total events loaded vs. filtered events shown
- **Max Magnitude**: Highest magnitude with location/time details
- **Deepest Event**: Maximum depth with associated event information
- **Date Range**: Full temporal span of loaded data

### Advanced Filtering
- **Date Range**: Filter by start and end dates (UTC)
- **Magnitude Range**: Min/max magnitude filters
- **Depth Range**: Min/max depth filters (kilometers)
- **Location Search**: Text search within place descriptions
- **Status Filter**: Filter by review status (reviewed/automatic/all)
- **Myanmar Boundary**: Toggle to show only events within Myanmar bounding box (9.5°-28.7°N, 92°-101.2°E)
- **Magnitude Type**: Filter by magnitude type (mb, ml, mw, etc.)
- **Reset Filters**: One-click return to default filter settings

### USGS Data Download Panel
- **Date Range Selection**: Start and end dates for USGS queries
- **Magnitude Constraints**: Optional min/max magnitude parameters
- **Depth Constraints**: Optional min/max depth parameters (kilometers)
- **Myanmar Only Toggle**: Restrict USGS query to Myanmar bounding box
- **Fetch & Load**: Direct data loading into dashboard
- **Download CSV**: Save USGS query results as CSV file
- **Open USGS Search**: Quick link to official USGS search interface

### Data Export
- **Filtered CSV Export**: Export currently filtered dataset as CSV
- Includes columns: time_utc, latitude, longitude, depth_km, mag, magType, place, status, id
- Proper CSV escaping for special characters
- Filename: `filtered_events.csv`

## Technical Architecture

### Frontend Stack
- **HTML5**: Semantic markup with ARIA labels for accessibility
- **CSS3**: Modern styling with CSS Grid, Flexbox, and custom properties
- **Vanilla JavaScript**: No framework dependencies (ES6+)

### External Libraries (CDN)
- **PapaParse v5.4.1**: CSV parsing library
- **Plotly.js v2.30.0**: Interactive charting and visualization
- **Leaflet v1.9.4**: Interactive mapping library

### Data Processing
- **CSV Parsing**: Intelligent row validation to filter out non-event rows and summary data
- **Data Normalization**: Converts raw CSV columns into typed JavaScript objects
- **Extent Computation**: Calculates min/max values for dates, magnitudes, and depths
- **Real-time Filtering**: Client-side filtering with sub-second performance
- **Bucketing Algorithms**: Day/week/month aggregation for time series

### Browser Compatibility
- Modern browsers with ES6+ support (Chrome 60+, Firefox 60+, Safari 12+, Edge 79+)
- Requires JavaScript enabled
- Responsive design for desktop and tablet screens

## Installation & Usage

### Prerequisites
- A local web server (required due to CORS restrictions)
- Modern web browser

### Quick Start

1. **Clone or download this repository**
   ```bash
   cd V4_Final
   ```

2. **Start a local server**

   **Python 3.x:**
   ```powershell
   python -m http.server 8000
   ```

   **Python 2.x:**
   ```powershell
   python -m SimpleHTTPServer 8000
   ```

   **Node.js (http-server):**
   ```bash
   npx http-server -p 8000
   ```

   **PHP:**
   ```bash
   php -S localhost:8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

### Loading Data

#### Option 1: Load Sample Data
1. Click **"Load sample (query.csv)"** button
2. Dashboard automatically parses and displays the sample dataset

#### Option 2: Upload Local CSV
1. Click **"Upload CSV"** button
2. Select a CSV file downloaded from USGS
3. Dashboard parses and displays the data

#### Option 3: Fetch from USGS
1. Configure parameters in the "USGS data download" panel:
   - Set start and end dates (UTC timezone)
   - Optionally set magnitude range (e.g., 4.0 - 6.0)
   - Optionally set depth range (e.g., 0 - 100 km)
   - Toggle "Myanmar only" if needed
2. Click **"Fetch & Load"** to query USGS and load data
3. Or click **"Download CSV"** to save the query results

### Applying Filters

1. Load data using any method above
2. Adjust filters in the "Filters" panel:
   - Date range
   - Magnitude range
   - Depth range
   - Place search (text)
   - Status (reviewed/automatic)
   - Myanmar boundary toggle
   - Magnitude type
3. Visualizations update automatically as you change filters
4. Click **"Reset"** to restore default filter settings
5. Click **"Export filtered CSV"** to download filtered results

## File Structure

```
V4_Final/
│
├── index.html          # Main HTML structure and layout
├── styles.css          # Complete styling with custom dark theme
├── app.js              # Core application logic (991 lines)
├── query.csv           # Sample earthquake data (optional)
├── chatLog.txt         # Development log (optional)
└── README.md           # This documentation file
```

## Configuration

### Myanmar Bounding Box
Default coordinates (defined in `app.js`):
```javascript
const MYANMAR_BBOX = {
  minLat: 9.5,    // Southern boundary
  maxLat: 28.7,   // Northern boundary
  minLon: 92.0,   // Western boundary
  maxLon: 101.2   // Eastern boundary
};
```

### Tectonic Overlay Source
```javascript
const TECTONIC_URL = 
  "https://raw.githubusercontent.com/drtinkooo/myanmar-earthquake-archive/main/Myanmar_Tectonic_Map_2011.geojson";
```

### USGS API Endpoint
```javascript
const USGS_API_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";
```

### Expected CSV Columns
```javascript
const BASE_COLUMNS = [
  "time", "latitude", "longitude", "depth", "mag", "magType",
  "nst", "gap", "dmin", "rms", "id", "updated", "place",
  "type", "status"
];
```

## Data Format

### Input CSV Format
The dashboard expects CSV files in USGS format with the following required columns:
- `time`: ISO 8601 timestamp (e.g., "2024-01-15T08:30:45.000Z")
- `latitude`: Decimal degrees (-90 to 90)
- `longitude`: Decimal degrees (-180 to 180)
- `mag`: Magnitude value (numeric)
- `depth`: Depth in kilometers (numeric)

Optional but recommended columns:
- `place`: Location description
- `magType`: Type of magnitude (mb, ml, mw, etc.)
- `status`: Review status (reviewed, automatic)
- `id`, `updated`, `nst`, `gap`, `dmin`, `rms`, `type`

### Data Validation
The application includes robust validation:
- Filters out non-event rows (summary tables, headers)
- Validates date/time parsing
- Checks latitude/longitude bounds
- Handles missing or null values gracefully
- Sorts events by time (newest first)

## Customization

### Color Scheme
The dashboard uses CSS custom properties (variables) in `styles.css`:
```css
:root {
  --bg0: #0b0c10;        /* Dark background base */
  --bg1: #0f1220;        /* Slightly lighter background */
  --card: #101425cc;     /* Card background (semi-transparent) */
  --ink: #f2f5ff;        /* Main text color */
  --muted: #a5afc7;      /* Secondary text color */
  --hot: #ffcf5a;        /* Accent color (yellow) */
  --cool: #6ad7ff;       /* Accent color (cyan) */
  --good: #90ff9a;       /* Success color (green) */
  --danger: #ff6a8d;     /* Warning color (pink) */
}
```

### Depth Color Gradient
Modify the `depthToColor()` function in `app.js` to change depth-based coloring:
```javascript
function depthToColor(depthKm, minDepth, maxDepth) {
  // Current: Blue (shallow) to Orange (deep)
  // Customize RGB values as needed
}
```

### Time Bucket Options
Add or modify time aggregation options by editing the bucket selector in `index.html` and the `bucketKey()` function in `app.js`.

## Known Limitations

1. **Browser File Protocol**: Cannot fetch `query.csv` when opened directly via `file://` protocol due to CORS restrictions. Must use a local server.

2. **Large Datasets**: Performance may degrade with datasets exceeding 10,000 events. Consider pre-filtering data for large time ranges.

3. **Table Display**: Event table limited to 100 most recent events for performance. Use CSV export for full filtered dataset.

4. **Internet Required**: External dependencies (CDN libraries, OpenStreetMap tiles, tectonic GeoJSON) require internet connection.

5. **Time Zone**: All times displayed in UTC. No local timezone conversion.

## Offline Mode

To run completely offline, download and vendor the following libraries locally:
1. PapaParse: https://cdnjs.com/libraries/PapaParse
2. Plotly.js: https://plotly.com/javascript/getting-started/
3. Leaflet: https://leafletjs.com/download.html

Update the `<script>` and `<link>` tags in `index.html` to reference local files.

## Deployment

### GitHub Pages
1. Push repository to GitHub
2. Go to repository Settings → Pages
3. Select branch (e.g., `main`) and root folder
4. Save and access via `https://username.github.io/repository-name/`

### Static Hosting
Deploy to any static hosting service:
- Netlify
- Vercel
- Cloudflare Pages
- AWS S3 + CloudFront
- Azure Static Web Apps

Simply upload the entire folder; no build step required.

## Troubleshooting

### Issue: "No data loaded yet"
- **Cause**: File not found or CORS error
- **Solution**: Ensure you're running a local server, not opening `index.html` directly

### Issue: "USGS download failed"
- **Cause**: Network error, invalid parameters, or USGS API downtime
- **Solution**: Check date ranges, reduce time span, verify internet connection

### Issue: "No events found"
- **Cause**: Filters too restrictive or CSV format incorrect
- **Solution**: Reset filters, verify CSV has required columns

### Issue: Map not displaying
- **Cause**: Leaflet CSS/JS not loaded or network error
- **Solution**: Check browser console for errors, verify internet connection

### Issue: Charts not rendering
- **Cause**: Plotly.js not loaded
- **Solution**: Check browser console, verify CDN access

## Contributing

This is a standalone project. For improvements or bug reports:
1. Document the issue with screenshots and browser console errors
2. Describe expected vs. actual behavior
3. Include sample data or steps to reproduce

## License

This project appears to be educational/research software. Check with the original author for licensing terms.

## Credits

- **USGS**: United States Geological Survey for earthquake data
- **OpenStreetMap**: Map tiles and base layers
- **Plotly.js**: Interactive charts
- **Leaflet**: Interactive maps
- **PapaParse**: CSV parsing
- **Tectonic Data**: Myanmar Tectonic Map 2011 (GeoJSON)

## Version History

- **V4_Final**: Current version with complete USGS integration, interactive filtering, and export functionality

## Support

For questions about:
- **USGS Data**: https://earthquake.usgs.gov/fdsnws/event/1/
- **Dashboard Usage**: Refer to this README
- **Technical Issues**: Check browser console for error messages

---

**Note**: This dashboard is designed for research and educational purposes. Earthquake data is provided by USGS and should be verified against official sources for critical applications.

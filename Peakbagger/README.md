# Peakbagger GPX Analyzer

[![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2F580091.json&color=2ea44f)](https://greasyfork.org/en/scripts/580091-peakbagger-gpx-analyzer)
[![Install from Greasy Fork](https://img.shields.io/badge/install-Greasy%20Fork-blue)](https://update.greasyfork.org/scripts/580091/Peakbagger%20GPX%20Analyzer.user.js)

A Tampermonkey userscript that automatically injects a rich, interactive elevation chart and advanced route metrics into [Peakbagger](https://www.peakbagger.com/) ascent pages.

## How It Works

When you visit a Peakbagger ascent page that contains a "Download this GPS track" link, the script automatically intercepts the link, fetches the underlying XML GPX data natively within the browser, and renders a dynamic Chart.js canvas. 

Because the script parses the raw XML on the client-side, it is extremely fast and privacy-friendly.

### Core Features
- **Dual-Axis Charting:** Displays simultaneous lines for **Elevation by Distance** and **Elevation by Time**.
- **Interactive Tooltips:** Hovering over the chart reveals the precise elevation, distance, grade, and timestamp for any given trackpoint.
- **Map Synchronization:** Hovering over the chart actively injects a moving marker into Peakbagger's native geographic Leaflet map in real-time.
- **Unit Persistence:** Seamlessly toggle between Imperial (miles/feet) and Metric (km/meters) units. Your preference is saved locally.
- **Multi-Day Support:** Automatically detects trips spanning multiple days, appending "Day 1", "Day 2" labels to timestamps and axes.
- **Camping Spots:** Automatically identifies and maps out overnight camping coordinates.

---

## How Things Are Calculated

The script relies on raw data arrays extracted from the `<trkpt>` tags of the GPX file. The data is pre-processed to handle anomalies often found in GPS files.

### 1. Chronological Sorting
To combat out-of-order track segments (e.g., when a GPX editor appends Day 3 before Day 1, or Peakbagger merges tracks in reverse), the script first sorts every single `<trkpt>` by its `<time>` node. This guarantees distance and time accumulate chronologically.

### 2. Distance, Elevation Gain, and Grade
To make the totals closer to Garmin/Strava-style activity stats without using any external correction service, the script applies several client-side adjustment steps:
- **Distance (Confirmed Movement):** Computed using the **Haversine formula**. Instead of dropping every sub-5-meter step, the script holds those small steps in a pending buffer and adds their full path length once movement is confirmed by at least **5 meters** of displacement. This preserves dense switchbacks while still suppressing stationary GPS drift.
- **Bad GPS Jumps:** When timestamps are available, obviously impossible hiking-speed jumps are rejected from the adjusted mileage.
- **Elevation Gain (Smoothed Hysteresis):** Raw GPX elevations are filtered with a 5-point median and a short distance-window smoother. Gain is then counted with a confirmed ascent/descent hysteresis filter, so small dips do not reset the climb and noisy flat sections do not create phantom gain.
- **Grade (%) (Distance Window):** Tooltip grade is calculated from adjusted distance and smoothed elevation over a broader distance baseline, reducing wild spikes from points that are too close together.
- **Metric Note:** The stats area labels the totals as **Adjusted GPX metrics** and shows raw-vs-adjusted deltas only when the difference is meaningful.


### 3. Timing Metrics
- **Start Time:** The timestamp of the first chronological point in the GPX file.
- **Summit Time:** The timestamp belonging to the highest adjusted elevation point.
- **Back to Car Time:** The timestamp of the final chronological point.
- **Time to Summit:** The elapsed time between `Start Time` and `Summit Time`.
- **Time Back:** The elapsed time between `Summit Time` and `Back to Car Time`.

### 4. Multi-Day Handling
A **Relative Day Helper** computes what "Day" a timestamp belongs to relative to the trip's start date:
- Both the start date and the current point's date are converted to local midnight.
- The difference in days is calculated.
- If the trip spans more than 1 calendar day, the script prefixes all tooltips, axes, and stats with `Day X`.

### 5. Camping Spots
When parsing the GPX track chronologically, the script monitors the relative day of each trackpoint. If a trackpoint lands on **Day 2**, but the immediate previous trackpoint was on **Day 1**, that previous point is designated as the **Camping Spot for Day 1**. The latitude and longitude of this boundary point are extracted and displayed in the stats panel.

> [!NOTE]
> This detection logic is purely chronological (based on the transition of calendar days) and does not compare the spatial coordinates of Day 1's end to Day 2's start. Consequently, it is completely immune to overnight GPS drift; the script simply records the very last coordinate transmitted on Day 1 as the camp location.

---

## UI Interactions & Problem Solving

### Map Synchronization (The Hover Dot)
A major feature of this script is synchronizing the 2D elevation chart with Peakbagger's native geographic map. 
1. **Iframe Interception:** The script detects the `MasterMap.aspx` iframe on the page and accesses its internal `contentWindow`.
2. **Leaflet Hooking:** It successfully hooks into Peakbagger's global `L` (Leaflet) object and the `mapsPlaceholder` map instance.
3. **Real-time Injection:** During Chart.js's `onHover` event, the script extracts the geographic `lat`/`lon` hidden inside the hovered data point. It rapidly calls Leaflet's `setLatLng()` to move a high-visibility, color-coded `L.circleMarker` along the actual geographic route, perfectly in sync with the user's cursor on the chart.

### Fixing "The Jittering Problem"
When plotting two distinct X-axes (Distance vs. Time) on the same Y-axis canvas, Chart.js struggles to determine which line the user is hovering over, causing rapid visual jittering as the tooltip violently switches between the two datasets.
- **The Solution:** By setting the Chart.js interaction mode to `{ mode: 'nearest', intersect: true, axis: 'xy' }`, the engine evaluates the cursor's proximity in *both* horizontal and vertical space simultaneously. This creates a rock-solid hover focus that perfectly respects which line the user's mouse is physically closest to.

### Disappearing Focus Boundary
If the user moves their cursor far away from the charted lines (into the whitespace of the canvas), the tooltip and map dot should cleanly disappear instead of permanently locking to the edge of the graph.
- **The Solution:** We set `hitRadius: 40` on the datasets and `intersect: true` on the interaction engine. This creates an exact 40-pixel interactive boundary around the lines. The moment the cursor exits this 40-pixel radius, the hover focus is natively destroyed, instantly hiding the tooltip and dynamically fading out the Leaflet map dot.

### Dynamic Interaction Mode
When both the Distance and Time lines are enabled, the chart relies on exact 2D proximity (`mode: 'nearest', axis: 'xy'`) to determine focus. However, if the user disables one of the lines via the legend, enforcing a strict hit radius becomes unnecessary and restrictive.
- **The Solution:** We override the default legend `onClick` handler. When only **one line** is visible, the script dynamically switches the chart interaction to `{ mode: 'index', intersect: false }`. This disables the strict Y-axis proximity rules, allowing the user to seamlessly scrub along the X-axis from anywhere within the chart's vertical space. Toggling both lines back on instantly restores the strict 2D xy-proximity mode.

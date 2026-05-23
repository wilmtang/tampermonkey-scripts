# Peakbagger GPX Analyzer

A Tampermonkey userscript that automatically injects a rich, interactive elevation chart and advanced route metrics into [Peakbagger](https://www.peakbagger.com/) ascent pages.

## How It Works

When you visit a Peakbagger ascent page that contains a "Download this GPS track" link, the script automatically intercepts the link, fetches the underlying XML GPX data natively within the browser, and renders a dynamic Chart.js canvas. 

Because the script parses the raw XML on the client-side, it is extremely fast and privacy-friendly.

### Core Features
- **Dual-Axis Charting:** Displays simultaneous lines for **Elevation by Distance** and **Elevation by Time**.
- **Interactive Tooltips:** Hovering over the chart reveals the precise elevation, distance, grade, and timestamp for any given trackpoint.
- **Unit Persistence:** Seamlessly toggle between Imperial (miles/feet) and Metric (km/meters) units. Your preference is saved locally.
- **Multi-Day Support:** Automatically detects trips spanning multiple days, appending "Day 1", "Day 2" labels to timestamps and axes.
- **Camping Spots:** Automatically identifies and maps out overnight camping coordinates.

---

## How Things Are Calculated

The script relies on raw data arrays extracted from the `<trkpt>` tags of the GPX file. The data is pre-processed to handle anomalies often found in GPS files.

### 1. Chronological Sorting
To combat out-of-order track segments (e.g., when a GPX editor appends Day 3 before Day 1, or Peakbagger merges tracks in reverse), the script first sorts every single `<trkpt>` by its `<time>` node. This guarantees distance and time accumulate chronologically.

### 2. Distance and Grade
- **Distance:** Computed using the **Haversine formula**. The script calculates the great-circle distance between the `lat` and `lon` of consecutive trackpoints and accumulates it into a running total (`totalDistMiles`).
- **Grade (%):** Calculated at each point as the change in elevation divided by the distance traveled since the last point, multiplied by 100.

### 3. Timing Metrics
- **Start Time:** The timestamp of the first chronological point in the GPX file.
- **Summit Time:** The timestamp belonging to the trackpoint with the highest overall elevation (`maxEle`).
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


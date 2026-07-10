# Peakbagger Ascent Beta Filter

A Tampermonkey userscript that adds a stackable filter bar to [Peakbagger](https://www.peakbagger.com/) "Ascents of a Peak" pages (`PeakAscents.aspx`), so you can instantly narrow hundreds of logged ascents down to the ones that actually help you plan a climb.

## Why

A peak's ascent list mixes a few ascents with real beta — a written trip report, a GPS track, an external link — with hundreds of bare "I was here" entries that carry no information at all. Finding the useful ones means scanning the TR-Words / GPS / Link columns by eye, every time.

## What It Does

The script injects a sticky filter bar directly above the ascent table:

- **Has beta** — shows only ascents that have a trip report, a GPS track, *or* an external link; hides entries with none of the three. **On by default**, since beta-less rows don't help planning.
- **Trip report** — shows only ascents with a written trip report, with an adjustable **"≥ N words"** threshold (a 2-word report is not beta; a 500-word one is).
- **GPS track** — shows only ascents with a downloadable GPS track.
- **Link** — shows only ascents with a climber-provided external link (blog, Strava, forum thread, ...).

### Design details

- **Filters stack.** Every chip is an independent AND condition — add one on top of another, remove one, combine them freely. Each chip shows how many ascents have that attribute, and the bar always shows "Showing x of y ascents" with a one-click **Show all** escape hatch.
- **Preferences persist.** Chip states and the word threshold are saved in `localStorage`, so your setup — including whether beta-less ascents are hidden by default — survives page loads and applies on every peak you look at. This also means the client-side filters stack cleanly on top of Peakbagger's own URL filters: click a year link, change the sort, or switch units, and your filters re-apply to the new server-filtered view.
- **Empty years collapse.** When a filter hides every ascent in a year, that year's separator row is hidden too, instead of leaving a stack of empty headings.
- **Column-aware parsing.** Peakbagger renders a different column set per URL variant (all-years vs. single-year vs. metric), so the script resolves the GPS / TR-Words / Link columns from the header row on every load rather than assuming fixed positions.
- **Compact view handled.** The default `PeakAscents.aspx?pid=...` view (no `y=` parameter) only renders Climber + Date columns — there is nothing to filter on. There the bar degrades to a hint with a one-click link to the full "all years, full details" view (`y=9999`), preserving your `sort` and unit parameters.

## Privacy

The script makes no network requests and sends nothing anywhere. It only reads the ascent table already on the page and stores your filter preferences in your browser's `localStorage`.

## Compatibility

Runs on `www.peakbagger.com/climber/PeakAscents.aspx` (and the non-`www` host). Works alongside the [Peakbagger GPX Analyzer](../Peakbagger) script, which enhances the individual ascent pages these rows link to.

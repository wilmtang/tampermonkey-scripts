# Google Maps Reliable Street View Toggle

[![Install local userscript](https://img.shields.io/badge/install-local%20userscript-blue)](Google%20Maps%20Reliable%20Street%20View%20Toggle.user.js)

A Tampermonkey userscript that toggles the Google Maps Street View layer with `Ctrl+S`.

## First-Load Fix

The earlier script often did not load on the first Google Maps visit because its metadata only matched:

```text
https://www.google.com/maps/*
```

That pattern requires a slash after `/maps`, so it misses initial URLs such as:

```text
https://www.google.com/maps
https://www.google.com/maps?entry=ttu
```

Google Maps later rewrites the URL to a deeper path like `/maps/@...`. Refreshing at that rewritten URL makes the old metadata match, which is why the Tampermonkey icon often showed no script count until after a refresh.

This script uses `maps*` patterns and a Google-domain regex include so it can load on `/maps`, `/maps?...`, and `/maps/...` URLs from the first navigation.

## Use

Install `Google Maps Reliable Street View Toggle.user.js` in Tampermonkey, then open Google Maps and press:

```text
Ctrl+S
```

The shortcut blocks the browser's normal Save Page action and clicks the Street View layer control when Google Maps has rendered it.

## Supported Pages

- `https://www.google.com/maps`
- `https://www.google.com/maps?...`
- `https://www.google.com/maps/...`
- Google country domains under `/maps`, such as `https://www.google.co.uk/maps`

## Reliability Notes

Google Maps replaces its controls dynamically during load and navigation. The script watches DOM changes, periodically rescans for the Street View control, and also re-finds the control every time `Ctrl+S` is pressed so stale button references do not break the shortcut.

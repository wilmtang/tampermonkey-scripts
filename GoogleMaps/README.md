# Google Maps Reliable Street View Toggle

[![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2F583283.json&color=2ea44f)](https://greasyfork.org/en/scripts/583283-google-maps-reliable-street-view-toggle)
[![Install from Greasy Fork](https://img.shields.io/badge/install-Greasy%20Fork-blue)](https://update.greasyfork.org/scripts/583283/Google%20Maps%20Reliable%20Street%20View%20Toggle.user.js)

A Tampermonkey userscript that toggles the Google Maps Street View layer with `Ctrl+S`.

## First-Load Reliability

Symptom: Tampermonkey sometimes showed **no script count** on its toolbar icon on the first Google Maps visit (the script never ran), but reloading the same page made it work. A missing count means the script was not *injected*, so the fix is in the metadata, not the page logic. Version 1.6.0 addresses the two causes that are fixable in the script:

- **Isolated-world execution.** With `@grant none` the script ran in the page's own JavaScript world, which Google Maps' strict Content-Security-Policy can intermittently block — so it silently never started. It now runs with `@grant GM_addStyle`, which makes Tampermonkey execute it in its sandboxed content-script world (not subject to the page CSP). The script only uses the DOM, so this changes nothing else.
- **Broader URL matching.** `@match` now covers `*://www.google.com/maps*`, `*://google.com/maps*`, and `*://maps.google.com/*`, plus a `maps.`-aware regex include for Google country domains — so opening Maps via any of those hosts matches from the first navigation.

A third cause is outside the script's control: Chrome can **prerender** Google Maps from the address bar or restore it from the back/forward cache, and userscript managers can fail to inject into a prerendered document. The script re-arms on `pageshow` for back/forward restores. If you still see an occasional miss, turn off **Settings → Performance → Preload pages** in Chrome (or just reload once).

## Use

Install `Google Maps Reliable Street View Toggle.user.js` in Tampermonkey, then open Google Maps and press:

```text
Ctrl+S
```

A plain `Ctrl+S` blocks the browser's normal Save Page action and clicks the Street View layer control when Google Maps has rendered it. Combinations with other modifiers (`Ctrl+Shift+S`, `Ctrl+Alt+S`, `Cmd+S`) are left alone for the browser.

## Supported Pages

- `https://www.google.com/maps`, `https://www.google.com/maps?...`, `https://www.google.com/maps/...`
- `https://maps.google.com/...`
- Google country domains under `/maps`, such as `https://www.google.co.uk/maps`

## Reliability Notes

Google Maps replaces its controls dynamically during load and navigation. The script watches DOM changes and rescans for the Street View control as a brief warm-up, but those watchers stop as soon as the control is found (and after 60 seconds regardless) instead of polling for the life of the tab. Because the control is also re-found every time `Ctrl+S` is pressed, the shortcut still works even after the watchers have stopped, and stale button references do not break it.

# onX Mountain Project Link

[![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2F583284.json&color=2ea44f)](https://greasyfork.org/en/scripts/583284-onx-mountain-project-link)
[![Install from Greasy Fork](https://img.shields.io/badge/install-Greasy%20Fork-blue)](https://update.greasyfork.org/scripts/583284/onX%20Mountain%20Project%20Link.user.js)

Adds a direct "Open on Mountain Project" link to onX Backcountry pages that show Mountain Project climbing areas and routes.

## Supported Pages

- Loads on `https://webmap.onxmaps.com/backcountry*` so it works after onX SPA navigation.
- `https://webmap.onxmaps.com/backcountry/map/mountain-project/areas/...`
- `https://webmap.onxmaps.com/backcountry/map/mountain-project/routes/...`

The script parses the Mountain Project ID from the onX URL and links to Mountain Project's canonical page. Mountain Project redirects ID-only links to the full slug URL, so the script does not need to guess route or area slugs.

## Install

[Install from Greasy Fork](https://update.greasyfork.org/scripts/583284/onX%20Mountain%20Project%20Link.user.js) with Tampermonkey, Greasemonkey, Violentmonkey, or another compatible userscript manager.

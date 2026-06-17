# onX Mountain Project Link

Adds a direct "Open on Mountain Project" link to onX Backcountry pages that show Mountain Project climbing areas and routes.

## Supported Pages

- `https://webmap.onxmaps.com/backcountry/map/mountain-project/areas/...`
- `https://webmap.onxmaps.com/backcountry/map/mountain-project/routes/...`

The script parses the Mountain Project ID from the onX URL and links to Mountain Project's canonical page. Mountain Project redirects ID-only links to the full slug URL, so the script does not need to guess route or area slugs.

## Install

[Install the local userscript](onX%20Mountain%20Project%20Link.user.js) with Tampermonkey, Greasemonkey, Violentmonkey, or another compatible userscript manager.

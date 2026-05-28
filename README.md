# Tampermonkey Scripts

A small collection of browser userscripts maintained for Tampermonkey, Greasemonkey, and compatible userscript managers.

## Scripts

| Script | Site | Install | Greasy Fork |
| --- | --- | --- | --- |
| [Peakbagger GPX Analyzer](Peakbagger/README.md) | Peakbagger | [Install from Greasy Fork](https://update.greasyfork.org/scripts/580091/Peakbagger%20GPX%20Analyzer.user.js) | [![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2F580091.json&color=2ea44f)](https://greasyfork.org/en/scripts/580091-peakbagger-gpx-analyzer) |
| [Fix New Yorker Audio Player Scroll](NewYorker/README.md) | The New Yorker | [Install from Greasy Fork](https://update.greasyfork.org/scripts/580092/Fix%20New%20Yorker%20Audio%20Player%20Scroll.user.js) | [![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2F580092.json&color=2ea44f)](https://greasyfork.org/en/scripts/580092-fix-new-yorker-audio-player-scroll) |
| [LeetCode Copy Title & Markdown](Leetcode/README.md) | LeetCode | [Install from Greasy Fork](https://update.greasyfork.org/scripts/580093/LeetCode%20Copy%20Title%20%20Markdown.user.js) | [![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2F580093.json&color=2ea44f)](https://greasyfork.org/en/scripts/580093-leetcode-copy-title-markdown) |

## Greasy Fork Badge Template

Use this pattern for additional scripts:

```md
[![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2FSCRIPT_ID.json&color=2ea44f)](https://greasyfork.org/en/scripts/SCRIPT_ID)
```

## Adding a New Script

New scripts should follow the same GitHub + Greasy Fork publishing flow as the existing scripts.

Before publishing a new script to Greasy Fork, ask the repo owner whether they want the new script published and synced. If yes:

1. Use a `.user.js` filename.
2. Include clean userscript metadata: `@name`, `@namespace`, `@version`, `@description`, `@author wilmtang`, `@license MIT`, `@homepageURL`, `@supportURL`, `@match`, and any required `@grant`/`@require`.
3. Pin any external `@require` dependency to an exact version.
4. Create a README for the script.
5. Publish the script on Greasy Fork.
6. Configure Greasy Fork source syncing to the raw GitHub URL on `main`.
7. Configure synced additional info to the script README raw GitHub URL.
8. Confirm the repository GitHub webhook still delivers successfully to Greasy Fork.
9. Add the Greasy Fork install link and dynamic install-count badge to this README and the script README.

When changing script code later, bump `@version` before pushing so Greasy Fork and userscript managers treat it as an update.

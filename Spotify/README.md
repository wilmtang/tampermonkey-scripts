# Spotify Web Enable Right-Click and Copy

[![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2F606378.json&color=2ea44f)](https://greasyfork.org/en/scripts/606378-spotify-web-enable-right-click-and-copy)
[![Install from Greasy Fork](https://img.shields.io/badge/install-Greasy%20Fork-blue)](https://update.greasyfork.org/scripts/606378/Spotify%20Web%20Enable%20Right-Click%20and%20Copy.user.js)

Restores text selection, copy (`Ctrl+C` / `Cmd+C`), and the native browser right-click context menu on Spotify Web (`https://open.spotify.com/*`) while keeping Spotify's custom context menu intact.

## Features

- **Restores text selection across Spotify Web:** Enables selection on episode, playlist, album, and track titles, show names, descriptions, podcast transcripts, lyrics, the Now Playing bar, and song/artist/album text inside tracklist rows, and restores visible native `::selection` highlighting (`background-color: revert; color: revert`) on podcast transcripts where Spotify's undefined `--episode-transcript-selection-background` variable makes selections invisible.
- **Fixes draggable text elements:** Disables HTML5 element dragging (`-webkit-user-drag: none`) on main titles, Now Playing links, and main-view / footer draggable items (including tracklist rows) in Chromium/Safari so click-and-drag highlights text instead of initiating a drag.
- **Keeps interactive UI clean:** Excludes buttons, tabs, sliders, progress/volume bars, menus, and all of their descendants from text selection (`user-select: none`) so double-clicking or clicking controls does not highlight labels.
- **Smart context menu:**
  - Right-clicking **directly on highlighted text** (using selection `getBoundingClientRect()` hit-testing so spacing between multi-paragraph transcript lines still counts) or holding **`Alt`/`Option` + Right-Click** opens the native browser context menu.
  - Right-clicking anywhere else — even while unrelated text is selected elsewhere on the page — lets Spotify's custom context menu open normally.
- **CSP-safe execution:** Runs in the isolated userscript world via `@grant GM_addStyle` (with a DOM `<style>` fallback) to avoid Spotify's strict `Content-Security-Policy`.
- **Safe clipboard handling:** Protects non-editable selections on `copy` and plain `Ctrl+C` / `Cmd+C` without breaking `<input>`/`<textarea>` editing, `cut`, or modified shortcuts like `Ctrl+Shift+C` / `Cmd+Shift+C`.

## Known Trade-offs & Notes

- **Tracklist row selection vs. drag-and-drop:** Because song/artist/album text inside tracklist rows is selectable, drag-and-drop on tracklist rows and main/footer draggable links is disabled in Chromium/Safari (`-webkit-user-drag: none`), and double-clicking directly on row text may briefly select a word.
- **Browser compatibility:** Firefox ignores `-webkit-user-drag: none`, so drag-to-highlight on `draggable="true"` elements applies primarily to Chromium-based browsers and Safari.

## Install

[Install from Greasy Fork](https://update.greasyfork.org/scripts/606378/Spotify%20Web%20Enable%20Right-Click%20and%20Copy.user.js) with Tampermonkey, Greasemonkey, Violentmonkey, or another compatible userscript manager.

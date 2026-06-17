# Changelog

User-facing changes per script. Dates are when the change landed in this
repository; Greasy Fork picks up published scripts on the next sync.

## 2026-06-17 — onX Mountain Project Link

### onX Mountain Project Link — 0.1.0

- **New local script.** Adds an "Open on Mountain Project" link to onX
  Backcountry Mountain Project area and route pages. The script preserves onX's
  existing "From Mountain Project" attribution panel and adds a separate
  external link button.

## 2026-06-16 — audit fixes

A code audit ([AUDIT.md](AUDIT.md)) reviewed all five scripts; the fixes below
came out of it.

### Google Maps Reliable Street View Toggle — 1.4.1 → 1.6.0

- **Loads reliably on first visit.** The script now runs in Tampermonkey's
  isolated content-script world (`@grant GM_addStyle`) instead of the page
  world, so Google Maps' Content-Security-Policy can no longer intermittently
  block it — the cause of the script sometimes not loading until a page
  refresh. URL matching was also broadened to include `maps.google.com`, the
  `http`/`https` variants, and more Google country domains, and the script
  re-arms after back/forward-cache restores. (If misses persist, they are
  Chrome page-prerendering; turn off Settings → Performance → Preload pages.)
- **`Ctrl+S` is more precise.** Only a *plain* `Ctrl+S` toggles Street View;
  `Ctrl+Shift+S`, `Ctrl+Alt+S`, and `Cmd+S` now pass through to the browser.
- **Lighter on the page.** The background scan for the Street View button now
  stops once the button is found (and after 60s at most) instead of polling
  and observing the whole page for the entire session.

### LeetCode Copy Title & Markdown — 2.4 → 2.6

- **Correct links from every tab.** "Copy Markdown" now always produces
  `…/problems/<slug>/description/`. Previously, copying from the Solutions,
  Submissions, or Editorial tab produced a broken double-slash URL.
- **Cleaner Back-button behavior.** The history tweak that keeps the Back
  button working across problems is now limited to problem-to-problem
  navigation, so it no longer adds extra history entries elsewhere on
  LeetCode. Also removes console errors LeetCode's security policy used to log.

### AI Copy Cleaner for Obsidian — 0.1.3 → 0.1.4

- **Only reformats real content now.** Auto-clean on copy fires only when the
  selection contains structure the script is meant to fix — lists, code,
  tables, headings, blockquotes, links, sub/sup, or math. Plain text, bold
  labels, and ordinary prose now copy normally, so selecting UI text elsewhere
  on the page is no longer silently rewritten. The `Option+Shift+C`
  (`Alt+Shift+C`) shortcut still forces a clean copy on any selection.
- **Claude listed.** `claude.ai` was already supported; the description and
  README now say so (Gemini / ChatGPT / Claude / NeetCode).

### Fix New Yorker Audio Player Scroll — 1.2 → 1.3

- **More reliable on dynamically loaded players.** The scroll-prevention patch
  now re-applies when the audio player iframe finishes loading, so it binds to
  the live player window instead of a stale one.
- **No longer fails silently.** If the embed is cross-origin (which makes the
  patch impossible), the script now logs a one-time console warning explaining
  why scroll-prevention isn't taking effect, instead of appearing to work.

### Peakbagger GPX Analyzer — 13.11 → 13.12

- No functional change. Added source-code comments documenting the map-hover
  feature's dependency on Peakbagger's internal map globals and a distance
  edge case, for maintainability.

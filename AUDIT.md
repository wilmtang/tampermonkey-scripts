# Code Audit — tampermonkey-scripts

**Date:** 2026-06-16
**Scope:** All five userscripts plus repo metadata, READMEs, and hygiene.
**Method:** Manual code review of each `*.user.js`, `node --check` syntax validation, git tracking inspection, and targeted reproduction of suspected bugs.

All five scripts pass `node --check` (no syntax errors), and `.DS_Store` is correctly git-ignored. The findings below are logic bugs, behavioral risks, and consistency issues — none are crashes, but several degrade or break intended behavior.

## Summary

| # | Severity | Script | Issue | Status |
|---|----------|--------|-------|--------|
| 1 | High | LeetCode | Copied Markdown URL is malformed (double slash) on any tab except `/description/` | ✅ Fixed (v2.5) |
| 2 | High | New Yorker | Focus patch silently no-ops on a cross-origin embed; core feature likely never runs | ⬜ Open |
| 3 | Medium | Google Maps | Permanent 500ms polling + whole-document MutationObserver; unconditional Ctrl+S hijack | ⬜ Open |
| 4 | Medium | LeetCode | Global `replaceState`→`pushState` override mutates site routing for all code on the page | ✅ Fixed (v2.6) |
| 5 | Medium | AI Copy Cleaner | Capture-phase copy interception rewrites *every* copy site-wide, including non-content | ⬜ Open |
| 6 | Medium | Peakbagger | Map-hover feature depends on undocumented iframe globals; degrades silently | ⬜ Open |
| 7 | Low | New Yorker | Patch may bind to the iframe's pre-navigation window (timing) | ⬜ Open |
| 8 | Low | AI Copy Cleaner | `@match claude.ai` not reflected in `@description`; doc drift | ⬜ Open |
| 9 | Low | New Yorker | Filename/folder name disagrees with `@name` | ⬜ Open |
| 10 | Low | All | Debug `console.log` left in; brittle site-specific selectors; no tests | ⬜ Open |

> Remediation in progress — see the **Status** column and the per-finding notes below. Each fix is a separate commit; scripts follow the `AGENTS.md` rule of bumping `@version` on any code change.

---

## High severity

### 1. LeetCode — malformed Markdown URL on non-description tabs

**File:** `Leetcode/LeetCode Copy Title & Markdown.user.js:185-186`

```js
const cleanPathname = window.location.pathname.split('/description')[0] + '/description/';
const url = window.location.origin + cleanPathname;
```

The intent is to normalize any problem URL to `…/problems/<slug>/description/`. It only works when the path already contains `/description` or is the bare slug. On every other sub-tab it appends `/description/` to a path that still has a trailing slug segment, producing a double slash and an invalid path. Reproduced:

| Current path | Produced URL |
|---|---|
| `/problems/two-sum/description/` | `…/problems/two-sum/description/` ✅ |
| `/problems/two-sum` | `…/problems/two-sum/description/` ✅ |
| `/problems/two-sum/` | `…/problems/two-sum//description/` ❌ |
| `/problems/two-sum/solutions/` | `…/problems/two-sum/solutions//description/` ❌ |
| `/problems/two-sum/submissions/` | `…/problems/two-sum/submissions//description/` ❌ |
| `/problems/two-sum/editorial/` | `…/problems/two-sum/editorial//description/` ❌ |

**Impact:** The "Copy Markdown" button is most useful exactly when reading solutions/editorial, and that is when it emits a broken link into the user's notes.

**Suggested fix:** Derive the slug directly instead of string-splitting the full path:

```js
const slug = (window.location.pathname.match(/\/problems\/([^/]+)/) || [])[1];
const url = slug ? `${window.location.origin}/problems/${slug}/description/` : window.location.href;
```

> **✅ Fixed in v2.5.** Replaced the `split('/description')` logic with slug
> extraction (`/\/problems\/([^/]+)/`). Verified in Node that `/description/`,
> bare slug, `/solutions/`, `/submissions/`, and `/editorial/` paths all now
> produce `…/problems/<slug>/description/`, with a fallback to `location.href`
> for non-problem paths.

### 2. New Yorker — focus patch silently no-ops on a cross-origin embed

**File:** `NewYorker/Newyorker No Auto Scroll.user.js:22-41`

```js
const iframeWin = iframe.contentWindow;
...
const originalFocus = iframeWin.HTMLElement.prototype.focus;   // line 28
iframeWin.HTMLElement.prototype.focus = function (...args) { ... };
```

The whole mechanism reaches into the audio embed iframe's `contentWindow` and overrides its `HTMLElement.prototype.focus`. The embed target (`[data-testid="cne-audio-embed-target"]`) is a Condé Nast audio player that is commonly served from a different origin. If it is cross-origin, line 28 throws a `SecurityError`, which is swallowed by the bare `catch (e) {}` at line 38-40, so the script does nothing and gives no signal that it failed.

**Impact:** If the embed is cross-origin (very likely for a third-party player), the script's only feature never takes effect, yet it appears installed and healthy.

**Suggested action:** Confirm the embed's actual origin on a live article. If cross-origin, the prototype-patch approach cannot work and the fix needs a different strategy (e.g., intercepting scroll/focus on the parent document, or `scroll-behavior`/scroll-anchoring CSS). At minimum, log the swallowed error so silent failure is visible.

---

## Medium severity

### 3. Google Maps — permanent polling + whole-document observer, and unconditional Ctrl+S hijack

**File:** `GoogleMaps/Google Maps Reliable Street View Toggle.user.js:121-130, 94-112`

```js
domObserver.observe(root, { childList: true, subtree: true });   // entire document subtree
...
window.setInterval(() => cacheStreetViewButton('interval'), 500); // forever
```

Two always-on watchers run for the life of the tab on one of the heaviest, most-mutating SPAs on the web. The observer fires `cacheStreetViewButton` on every DOM mutation and the interval fires every 500ms indefinitely. Once the button is cached both paths short-circuit cheaply, but until it is found (and after any navigation that invalidates it) each call does a full `querySelectorAll(BUTTON_SELECTOR)` sweep. This is wasteful and never stops.

Separately, `handleShortcut` calls `e.preventDefault()` for **any** Ctrl+S (lines 99-101) before checking whether the button exists, so the browser's native "Save page" is permanently disabled on Maps even when the toggle isn't available. The check also doesn't exclude other modifiers, so Ctrl+Alt+S triggers it too.

**Suggested fix:** Disconnect the observer and `clearInterval` once the button is found (re-arm on URL change). Only `preventDefault()` after confirming a Ctrl+S that you will act on, and guard against extra modifiers (`!e.altKey && !e.metaKey && !e.shiftKey`).

### 4. LeetCode — global `replaceState`→`pushState` override

**File:** `Leetcode/LeetCode Copy Title & Markdown.user.js:346-405` (esp. 370-377)

```js
win.history.replaceState = function (...args) {
  const targetUrl = getUrlFromHistoryArgs(args);
  const result = targetUrl && targetUrl !== win.location.href && !isHandlingPopstate
    ? pushState(...args)        // converts replaceState into pushState
    : replaceState(...args);
  notify();
  return result;
};
```

This deliberately rewrites the page's `history.replaceState` so SPA route changes become real history entries (the script's stated goal — preserving Back). The side effect is that it changes `history` semantics for **all** code on the page, not just this script: LeetCode (or any library) that uses `replaceState` to update state *without* adding history now adds entries, which can bloat history and cause extra Back presses or unexpected navigation. The shim is also installed twice (directly via `unsafeWindow` and via an injected `<script>`); the `__lcCopyTitleMarkdownHistoryShimInstalled` guard makes the second a no-op, so it's harmless but redundant.

**Suggested action:** Keep if the Back-button benefit outweighs the risk, but document it and consider scoping the pushState conversion to only `/problems/` path changes. Remove the redundant second installation path.

> **✅ Fixed in v2.6.** The `replaceState`→`pushState` promotion is now gated by
> an `isProblemUrl()` check on **both** the current and target URLs, so native
> `replaceState` semantics are preserved everywhere except problem-to-problem
> navigation (where the Back-button fix is actually needed). The redundant
> inline-`<script>` installation path was removed: it was a no-op after the
> `unsafeWindow` install (guard flag) and is blocked by LeetCode's CSP anyway,
> so it only emitted console errors.

### 5. AI Copy Cleaner — capture-phase interception rewrites every copy

**File:** `AICopyCleaner/AI Copy Cleaner for Obsidian.user.js:183-225`

```js
document.addEventListener('copy', cleanCopy, true);  // capture phase, document-wide
...
event.preventDefault();
event.stopImmediatePropagation();   // blocks the site's own copy handlers
```

On every matched site the script intercepts all copy events in the capture phase, and on any non-collapsed, non-editable selection it calls `preventDefault()` + `stopImmediatePropagation()`, replacing clipboard contents with its Markdown/HTML rendering and blocking the site's native copy handler. It does skip editable selections (`isEditableSelection`), but for ordinary text selection anywhere on the page (sidebars, headers, model output, UI labels) the user's plain copy is silently transformed.

**Impact:** Surprising clipboard contents and potential interference with site copy features (e.g., a site's own "copy code" path that runs on the same event). The toast partly mitigates surprise but the override is non-opt-in.

**Suggested action:** Consider scoping the `copy` listener to the known content containers per site, or gate the auto-rewrite behind the explicit Alt+Shift+C shortcut (already implemented) and leave plain Ctrl/Cmd+C untouched.

### 6. Peakbagger — map-hover depends on undocumented iframe globals

**File:** `Peakbagger/Peakbagger GPX Analyzer.user.js:449-452`

```js
const mapIframe = document.querySelector('iframe[src*="MasterMap.aspx"], ...');
const iframeWin = mapIframe ? mapIframe.contentWindow : null;
if (activeElements.length > 0 && iframeWin && iframeWin.mapsPlaceholder && iframeWin.L) { ... }
```

The hover-to-highlight-on-map feature reaches into the map iframe and uses two private Peakbagger internals: the Leaflet instance `mapsPlaceholder` and the global `L`. These are same-origin (so accessible) but entirely undocumented and outside the script's control; any rename on Peakbagger's side disables the feature with no error. The condition fails closed (no marker), so it degrades silently rather than crashing — good — but it is fragile. The GPX `fetch` (line 584) and chart also assume same-origin and a non-blocking CSP; failure is caught and shown as "Error parsing GPX file."

**Suggested action:** No fix required, but document the dependency on `mapsPlaceholder`/`L` so the fragility is known, and keep the existing guards.

---

## Low severity / hygiene

### 7. New Yorker — patch timing on dynamic iframes
`patchIframeFocus` is invoked the moment an `<iframe>` node is added (lines 50-65). At that point `contentWindow` may still be the initial `about:blank` document; when the iframe navigates to its real `src`, the window (and its `HTMLElement.prototype`) is replaced, discarding the patch. Even in the same-origin case, patch-on-add can bind to the wrong window. Consider patching on the iframe's `load` event.

### 8. AI Copy Cleaner — description doesn't mention Claude
`@match https://claude.ai/*` is present (line 15) but `@description` (line 5) and the README describe only "Gemini/ChatGPT/NeetCode." Update the description so the supported-site list matches the `@match` rules.

### 9. New Yorker — name/file mismatch
The file and folder are `Newyorker No Auto Scroll.user.js`, but `@name`, the script README, and the root README all use "Fix New Yorker Audio Player Scroll." Functionally harmless, but the filename is the odd one out; rename for consistency or note it intentionally.

### 10. Cross-cutting
- **Debug logging left in:** `console.log` calls remain in the New Yorker (line 37), Google Maps (multiple), and LeetCode flows. Fine for development, noisy for users.
- **Brittle selectors:** every script keys off site-specific, undocumented hooks (`.text-title-large`, `content__u3I1`, `data-testid="cne-audio-embed-target"`, `mapsPlaceholder`, "Download this GPS track" link text). This is inherent to userscripts but means each is one site redesign away from breaking; the LeetCode `findTitleEl` fallback that scans all `h1, a, div` (lines 272-279) is the most expensive of these.
- **No tests:** the Peakbagger metrics engine (distance de-noising, confirmed-gain state machine, grade window, KaTeX-to-TeX reconstruction in AI Copy Cleaner) is non-trivial pure logic that would benefit from a few unit tests — it can be exercised in Node independently of the DOM.
- **Minor numeric edge cases (Peakbagger):** trailing points and bad-jump points retain the last confirmed cumulative distance (`distMByIndex`), slightly under-counting distance for those tail segments; very low impact.

---

## Recommendations (priority order)

1. Fix the LeetCode URL construction (#1) — small change, user-visible broken output.
2. Verify the New Yorker embed origin and confirm whether the focus patch ever runs (#2); add a log on the swallowed catch either way.
3. Tear down the Google Maps observer/interval once the button is found and tighten the Ctrl+S guard (#3).
4. Decide and document the intent of the LeetCode history override and the AI Copy Cleaner global copy interception (#4, #5); both are working as written but change host-page behavior broadly.
5. Sweep the low-severity items (#7-#10) when next bumping each script's `@version` (required by `AGENTS.md` before pushing).

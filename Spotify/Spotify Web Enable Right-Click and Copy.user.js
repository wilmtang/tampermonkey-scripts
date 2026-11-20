// Copyright (C) 2026 wilmtang <wilm.tang@outlook.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

// ==UserScript==
// @name         Spotify Web Enable Right-Click and Copy
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      1.0.0
// @description  Restores text selection, copy, and native right-click on Spotify Web while keeping Spotify's custom context menu intact.
// @author       wilmtang
// @license      AGPL-3.0-or-later
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/Spotify
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @match        https://open.spotify.com/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  if (window.__spotifyEnableRightClickCopyLoaded) return;
  window.__spotifyEnableRightClickCopyLoaded = true;

  const SELECTION_HIT_PADDING_PX = 4;

  // Enable selection broadly, then explicitly exclude interactive controls and all
  // of their descendants (otherwise children match `*` and excluded parents inherit
  // `user-select: text`). Also disable HTML5 element drag on titles, Now Playing
  // links, and main-view draggable items (including tracklist rows) so click-and-drag
  // selects text instead of initiating a drag.
  const CSS = `
    * {
      -webkit-user-select: text !important;
      user-select: text !important;
    }

    /* Spotify's episode transcript styles set ::selection background-color to an
       undefined CSS variable (--episode-transcript-selection-background), making
       selected transcript text invisible without reverting ::selection. */
    *::selection {
      background-color: revert !important;
      color: revert !important;
    }

    button,
    button *,
    [role="button"],
    [role="button"] *,
    [role="slider"],
    [role="slider"] *,
    [role="tab"],
    [role="tab"] *,
    [role="switch"],
    [role="switch"] *,
    [role="menuitem"],
    [role="menuitem"] *,
    [role="menuitemcheckbox"],
    [role="menuitemcheckbox"] *,
    [role="menuitemradio"],
    [role="menuitemradio"] *,
    [role="option"],
    [role="option"] *,
    [role="separator"],
    [role="separator"] *,
    input[type="range"],
    [data-testid="playback-progressbar"],
    [data-testid="playback-progressbar"] *,
    [data-testid="volume-bar"],
    [data-testid="volume-bar"] * {
      -webkit-user-select: none !important;
      user-select: none !important;
    }

    [data-testid="entityTitle"],
    [data-testid="entityTitle"] *,
    [data-testid="context-item-link"],
    [data-testid="context-item-link"] *,
    [data-testid="context-item-info-subtitles"],
    [data-testid="context-item-info-subtitles"] *,
    [data-testid="tracklist-row"],
    [data-testid="tracklist-row"] *,
    main [draggable="true"],
    main [draggable="true"] *,
    footer [draggable="true"],
    footer [draggable="true"] * {
      -webkit-user-drag: none !important;
    }
  `;

  function injectStyle(css) {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
      return;
    }

    const apply = () => {
      const target = document.head || document.documentElement;
      if (!target) return;
      const style = document.createElement('style');
      style.textContent = css;
      target.appendChild(style);
    };

    if (document.head) {
      apply();
    } else {
      window.addEventListener('DOMContentLoaded', apply, { once: true });
    }
  }

  function isEditableTarget(node) {
    const el = node && node.nodeType === 1 ? node : node?.parentElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  }

  function getNonEmptySelection() {
    const sel = typeof window.getSelection === 'function' ? window.getSelection() : null;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    if (sel.toString().trim().length === 0) return null;
    return sel;
  }

  function isEventOnSelection(event, sel) {
    // Keyboard-triggered context menu (Shift+F10 / Menu key) has zero coordinates.
    if (event.button !== 2 && event.clientX === 0 && event.clientY === 0) {
      return true;
    }

    const x = event.clientX;
    const y = event.clientY;
    for (let i = 0; i < sel.rangeCount; i += 1) {
      const rect = sel.getRangeAt(i).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (
        x >= rect.left - SELECTION_HIT_PADDING_PX &&
        x <= rect.right + SELECTION_HIT_PADDING_PX &&
        y >= rect.top - SELECTION_HIT_PADDING_PX &&
        y <= rect.bottom + SELECTION_HIT_PADDING_PX
      ) {
        return true;
      }
    }

    return false;
  }

  injectStyle(CSS);

  // Open the native browser menu when Alt/Option is held or when right-clicking
  // directly on highlighted text; otherwise let Spotify's custom menu open.
  window.addEventListener(
    'contextmenu',
    (event) => {
      if (event.altKey) {
        event.stopImmediatePropagation();
        return;
      }

      if (isEditableTarget(event.target)) return;

      const sel = getNonEmptySelection();
      if (sel && isEventOnSelection(event, sel)) {
        event.stopImmediatePropagation();
      }
    },
    true
  );

  // Protect non-editable text selections from page copy/shortcut interception
  // without breaking editable inputs, cut events, or modified shortcuts (e.g. Ctrl+Shift+C).
  window.addEventListener(
    'copy',
    (event) => {
      if (isEditableTarget(event.target)) return;
      if (getNonEmptySelection()) {
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'keydown',
    (event) => {
      if (isEditableTarget(event.target)) return;
      if (event.altKey || event.shiftKey) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.ctrlKey && event.metaKey) return;
      if (typeof event.key !== 'string' || event.key.toLowerCase() !== 'c') return;

      if (getNonEmptySelection()) {
        event.stopImmediatePropagation();
      }
    },
    true
  );
})();

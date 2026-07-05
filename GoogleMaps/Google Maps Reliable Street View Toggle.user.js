// Copyright (C) 2026 wilmtang <wilm.tang@outlook.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

// ==UserScript==
// @name         Google Maps Reliable Street View Toggle
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      1.7.1
// @description  Toggle the Google Maps Street View layer with Ctrl+S.
// @author       wilmtang
// @license      AGPL-3.0-or-later
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/GoogleMaps
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @updateURL    https://update.greasyfork.org/scripts/583283/Google%20Maps%20Reliable%20Street%20View%20Toggle.meta.js
// @downloadURL  https://update.greasyfork.org/scripts/583283/Google%20Maps%20Reliable%20Street%20View%20Toggle.user.js
// @match        *://www.google.com/maps*
// @match        *://google.com/maps*
// @match        *://maps.google.com/*
// @include      /^https?:\/\/(www\.|maps\.)?google\.[^/]+\/maps(?:[/?#].*)?$/
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const LOG_PREFIX = '[Google Maps Street View Toggle]';
  const STREET_VIEW_RE = /\bStreet\s+View\b/i;
  const EXACT_STREET_VIEW_RE = /^Browse\s+Street\s+View\s+images$/i;
  const NON_TOGGLE_RE = /\b(exit|close)\s+Street\s+View\b/i;
  const BUTTON_SELECTOR = [
    'button[aria-label]',
    'button[title]',
    'button',
    '[role="button"][aria-label]',
    '[role="button"][title]',
  ].join(',');

  let streetViewButton = null;
  let domObserver = null;
  let scanIntervalId = null;
  let watchersDeadline = 0;
  const WATCH_MAX_MS = 60000;

  function getControlLabel(el) {
    return [
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.textContent,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isUsableControl(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (!el.isConnected) return false;
    if (el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    return true;
  }

  function isStreetViewControl(el) {
    if (!isUsableControl(el)) return false;

    const label = getControlLabel(el);
    if (!label) return false;
    if (NON_TOGGLE_RE.test(label)) return false;

    return EXACT_STREET_VIEW_RE.test(label) || STREET_VIEW_RE.test(label);
  }

  function findStreetViewButton() {
    const exactButton = document.querySelector('button[aria-label="Browse Street View images"]');
    if (exactButton && isStreetViewControl(exactButton)) {
      return exactButton;
    }

    return Array.from(document.querySelectorAll(BUTTON_SELECTOR)).find(isStreetViewControl) || null;
  }

  function cacheStreetViewButton(source) {
    if (streetViewButton && isStreetViewControl(streetViewButton)) {
      return streetViewButton;
    }

    const found = findStreetViewButton();
    if (found) {
      streetViewButton = found;
      console.log(`${LOG_PREFIX} Street View button detected (${source}).`);
      stopWatchers(); // found it -- stop the perpetual polling/observing
    }

    return streetViewButton;
  }

  // The button is also located on demand in handleShortcut, so these watchers
  // are only a warm-up. They stop as soon as the button is found and, as a
  // safety net, give up after WATCH_MAX_MS so neither the 500ms interval nor
  // the document-wide MutationObserver runs for the life of the tab.
  function stopWatchers() {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    if (scanIntervalId !== null) {
      clearInterval(scanIntervalId);
      scanIntervalId = null;
    }
  }

  function startWatchers() {
    watchersDeadline = Date.now() + WATCH_MAX_MS;
    if (!domObserver) startObserver();
    if (scanIntervalId === null) {
      scanIntervalId = window.setInterval(() => {
        if (cacheStreetViewButton('interval')) return;      // found -> stops itself
        if (Date.now() > watchersDeadline) stopWatchers();  // give up perpetual scan
      }, 500);
    }
  }

  function simulateClick(btn) {
    btn.click();
  }

  // True while the Street View imagery layer is on. Google opens its imagery
  // panel when the layer is enabled; that panel carries the checkbox below, so
  // its checked state is a reliable read of whether the layer is currently on.
  function streetViewLayerOn() {
    const toggle = document.querySelector(
      'button[role="checkbox"][aria-label="Show images"]'
    );
    return !!toggle && toggle.getAttribute('aria-checked') === 'true';
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  // Google Maps sometimes ignores a single click on the Street View control
  // ("Browse Street View images", i.e. the Pegman). The main case: returning to
  // the Maps tab after it has been in the background -- Maps is briefly
  // unresponsive while it wakes from background throttling, so the first click
  // is silently dropped (this can also happen during initial page load). That
  // is why one Ctrl+S occasionally did nothing and the toggle had to be pressed
  // twice. Instead of clicking once, keep clicking until the layer's state
  // actually flips (or give up). Once a click lands the flip is detected within
  // a frame and we stop, so it never double-toggles; dropped clicks are
  // harmless and simply retried.
  const TOGGLE_DEADLINE_MS = 4000;
  const TOGGLE_RETRY_MS = 250;
  let toggleToken = 0;

  async function toggleStreetView() {
    const myToken = ++toggleToken; // a newer press supersedes this attempt
    const wasOn = streetViewLayerOn();
    const deadline = Date.now() + TOGGLE_DEADLINE_MS;

    do {
      const btn = findStreetViewButton();
      if (btn) simulateClick(btn);
      await sleep(TOGGLE_RETRY_MS);
      if (toggleToken !== myToken) return; // superseded by a later press
      if (streetViewLayerOn() !== wasOn) {
        console.log(`${LOG_PREFIX} Street View toggled via Ctrl+S.`);
        return;
      }
    } while (Date.now() < deadline);

    console.log(`${LOG_PREFIX} Street View control not ready; toggle gave up.`);
  }

  function handleShortcut(e) {
    // Plain Ctrl+S only. Let Ctrl+Shift+S, Ctrl+Alt+S and Cmd+S fall through
    // to the browser instead of over-triggering the toggle.
    if (!e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    if ((e.key || '').toLowerCase() !== 's') return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    toggleStreetView();
  }

  function startObserver() {
    const root = document.documentElement || document.body;
    if (!root) {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
      return;
    }

    domObserver = new MutationObserver(() => {
      cacheStreetViewButton('observer');
    });

    domObserver.observe(root, { childList: true, subtree: true });
  }

  document.addEventListener('keydown', handleShortcut, true);
  startWatchers();

  // If the tab is restored from the back/forward cache, the warm-up watchers
  // may already have been torn down (and the cached button may be stale), so
  // re-arm them to keep Ctrl+S responsive.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      streetViewButton = null;
      startWatchers();
    }
  });

  console.log(`${LOG_PREFIX} loaded on ${window.location.href}. Press Ctrl+S to toggle the Street View layer.`);
})();

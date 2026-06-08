// ==UserScript==
// @name         Google Maps Reliable Street View Toggle
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      1.4.1
// @description  Toggle the Google Maps Street View layer with Ctrl+S.
// @author       wilmtang
// @license      MIT
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/GoogleMaps
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @updateURL    https://raw.githubusercontent.com/wilmtang/tampermonkey-scripts/main/GoogleMaps/Google%20Maps%20Reliable%20Street%20View%20Toggle.user.js
// @downloadURL  https://raw.githubusercontent.com/wilmtang/tampermonkey-scripts/main/GoogleMaps/Google%20Maps%20Reliable%20Street%20View%20Toggle.user.js
// @match        https://www.google.com/maps*
// @match        https://google.com/maps*
// @include      /^https:\/\/(www\.)?google\.[^/]+\/maps(?:[/?#].*)?$/
// @run-at       document-start
// @grant        none
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
    }

    return streetViewButton;
  }

  function simulateClick(btn) {
    btn.click();
  }

  function handleShortcut(e) {
    if (!e.ctrlKey || e.key.toLowerCase() !== 's') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    streetViewButton = findStreetViewButton();
    console.log(`${LOG_PREFIX} Ctrl+S triggered.`);

    if (streetViewButton) {
      simulateClick(streetViewButton);
      console.log(`${LOG_PREFIX} Street View toggled via Ctrl+S.`);
    } else {
      console.log(`${LOG_PREFIX} Street View button not ready.`);
    }
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
  window.setInterval(() => cacheStreetViewButton('interval'), 500);
  startObserver();

  console.log(`${LOG_PREFIX} loaded on ${window.location.href}. Press Ctrl+S to toggle the Street View layer.`);
})();

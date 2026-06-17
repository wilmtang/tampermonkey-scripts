// ==UserScript==
// @name         onX Mountain Project Link
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      0.1.0
// @description  Adds direct Mountain Project links to onX Backcountry Mountain Project area and route pages.
// @author       wilmtang
// @license      MIT
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/OnXMountainProject
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @updateURL    https://raw.githubusercontent.com/wilmtang/tampermonkey-scripts/main/OnXMountainProject/onX%20Mountain%20Project%20Link.user.js
// @downloadURL  https://raw.githubusercontent.com/wilmtang/tampermonkey-scripts/main/OnXMountainProject/onX%20Mountain%20Project%20Link.user.js
// @match        https://webmap.onxmaps.com/backcountry/map/mountain-project/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_PREFIX = 'onx-mp-link';
  const LINK_ID = `${SCRIPT_PREFIX}-open-link`;
  const LINK_SELECTOR = `#${LINK_ID}`;
  const CARD_SELECTOR = '#mountain-project-card';
  const ATTRIBUTION_SELECTOR = 'button.attribution-button';
  const URL_RE = /\/backcountry\/map\/mountain-project\/(areas|routes)\/(\d+)(?:\/|$)/;

  let lastPath = location.pathname;
  let updateScheduled = false;

  if (window.__onxMountainProjectLinkLoaded) {
    window.dispatchEvent(new Event(`${SCRIPT_PREFIX}:locationchange`));
    return;
  }

  window.__onxMountainProjectLinkLoaded = true;

  function addStyle(css) {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
      return;
    }

    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
  }

  function getMountainProjectTarget() {
    const match = location.pathname.match(URL_RE);
    if (!match) return null;

    const [, onxType, id] = match;
    const mpType = onxType === 'areas' ? 'area' : 'route';

    return {
      href: `https://www.mountainproject.com/${mpType}/${id}`,
      label: `Open ${mpType} on Mountain Project`,
    };
  }

  function createLink(target) {
    const link = document.createElement('a');
    link.id = LINK_ID;
    link.className = `${SCRIPT_PREFIX}__open-link`;
    link.href = target.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = target.label;
    link.setAttribute('aria-label', target.label);

    const text = document.createElement('span');
    text.textContent = 'Open on Mountain Project';
    link.append(text);

    return link;
  }

  function updateLink() {
    const target = getMountainProjectTarget();
    const existingLink = document.querySelector(LINK_SELECTOR);

    if (!target) {
      existingLink?.remove();
      return;
    }

    const card = document.querySelector(CARD_SELECTOR);
    const attributionButton = card?.querySelector(ATTRIBUTION_SELECTOR) || document.querySelector(ATTRIBUTION_SELECTOR);
    if (!attributionButton) return;

    if (existingLink) {
      existingLink.href = target.href;
      existingLink.title = target.label;
      existingLink.setAttribute('aria-label', target.label);

      if (existingLink.previousElementSibling !== attributionButton) {
        attributionButton.insertAdjacentElement('afterend', existingLink);
      }

      return;
    }

    attributionButton.insertAdjacentElement('afterend', createLink(target));
  }

  function scheduleLinkUpdate() {
    if (updateScheduled) return;
    updateScheduled = true;

    const run = () => {
      updateScheduled = false;
      updateLink();
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
      return;
    }

    window.setTimeout(run, 0);
  }

  function observeUrlChanges() {
    const handleLocationChange = () => {
      if (location.pathname === lastPath) return;
      lastPath = location.pathname;
      updateLink();
    };

    const notify = () => {
      window.dispatchEvent(new Event(`${SCRIPT_PREFIX}:locationchange`));
    };

    const wrapHistoryMethod = method => {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        notify();
        return result;
      };
    };

    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');
    window.addEventListener('popstate', notify);
    window.addEventListener(`${SCRIPT_PREFIX}:locationchange`, handleLocationChange);
    window.setInterval(handleLocationChange, 1000);
  }

  function observeDomChanges() {
    const observer = new MutationObserver(scheduleLinkUpdate);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  addStyle(`
    .${SCRIPT_PREFIX}__open-link {
      align-items: center;
      background: #f3f4f5;
      border: 0;
      border-radius: 999px;
      box-sizing: border-box;
      color: #2b2b2b;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 14px;
      font-weight: 700;
      gap: 6px;
      line-height: 1;
      margin-left: 8px;
      min-height: 32px;
      padding: 0 13px;
      text-decoration: none;
      vertical-align: middle;
      white-space: nowrap;
    }

    .${SCRIPT_PREFIX}__open-link:hover,
    .${SCRIPT_PREFIX}__open-link:focus {
      background: #e5e8ea;
      color: #111;
      outline: none;
      text-decoration: none;
    }

    .${SCRIPT_PREFIX}__open-link:focus-visible {
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.35);
    }
  `);

  observeUrlChanges();
  observeDomChanges();
  updateLink();
})();

// Copyright (C) 2026 wilmtang <wilm.tang@outlook.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

// ==UserScript==
// @name         FreeCampsites Map Links
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      0.2.0
// @description  Adds buttons to open the campsite's GPS coordinates in Google Maps, Gaia GPS, and onX Backcountry.
// @author       wilmtang
// @license      AGPL-3.0-or-later
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/FreeCampsites
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @match        https://freecampsites.net/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_PREFIX = 'fc-maps-links';
  const CONTAINER_ID = `${SCRIPT_PREFIX}-container`;
  let updateScheduled = false;

  function addStyle(css) {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
      return;
    }

    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
  }

  function createGoogleMapsIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', `${SCRIPT_PREFIX}__icon`);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z');
    svg.append(path);

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '10');
    circle.setAttribute('r', '3');
    svg.append(circle);

    return svg;
  }

  function createLink(href, label, colorClass, iconFunc) {
    const link = document.createElement('a');
    link.className = `${SCRIPT_PREFIX}__open-link ${colorClass}`;
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `Open in ${label}`;
    link.setAttribute('aria-label', `Open in ${label}`);

    const text = document.createElement('span');
    text.textContent = label;
    link.append(iconFunc ? iconFunc() : '', text);

    return link;
  }

  function updateLink() {
    const daddrLink = document.querySelector('a[href^="https://maps.google.com/maps?daddr="]');
    let container = document.getElementById(CONTAINER_ID);
    
    if (!daddrLink) {
      if (container) container.remove();
      return;
    }

    try {
      const url = new URL(daddrLink.href);
      const coords = url.searchParams.get('daddr');
      if (!coords) return;
      
      const [lat, lon] = coords.split(',');
      if (!lat || !lon) return;

      const gmapsHref = `https://www.google.com/maps/place/${coords}`;
      const gaiaHref = `https://www.gaiagps.com/map/${lon}/${lat}`;
      const onxHref = `https://webmap.onxmaps.com/backcountry/map/query/${lat},${lon}`;

      if (container) {
        // Just update hrefs if container exists
        const links = container.querySelectorAll('a');
        if (links.length === 3) {
          links[0].href = gmapsHref;
          links[1].href = gaiaHref;
          links[2].href = onxHref;
        }
        if (container.previousElementSibling !== daddrLink) {
           daddrLink.insertAdjacentElement('afterend', container);
        }
        return;
      }

      container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.className = `${SCRIPT_PREFIX}__container`;

      container.append(
        createLink(gmapsHref, 'Google Maps', `${SCRIPT_PREFIX}--gmaps`, createGoogleMapsIcon),
        createLink(gaiaHref, 'Gaia GPS', `${SCRIPT_PREFIX}--gaia`, null),
        createLink(onxHref, 'onX', `${SCRIPT_PREFIX}--onx`, null)
      );

      daddrLink.insertAdjacentElement('afterend', container);
    } catch (e) {
      console.error(e);
    }
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

  function observeDomChanges() {
    const observer = new MutationObserver(scheduleLinkUpdate);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  addStyle(`
    .${SCRIPT_PREFIX}__container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    .${SCRIPT_PREFIX}__open-link {
      align-items: center;
      border: 0;
      border-radius: 4px;
      box-sizing: border-box;
      color: #ffffff !important;
      cursor: pointer;
      display: inline-flex;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      font-weight: 600;
      gap: 6px;
      justify-content: center;
      letter-spacing: 0.2px;
      line-height: 1;
      min-height: 24px;
      padding: 0 10px;
      text-decoration: none !important;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    }
    .${SCRIPT_PREFIX}__open-link:hover {
      opacity: 0.85;
    }
    .${SCRIPT_PREFIX}__open-link:active {
      opacity: 0.7;
    }
    .${SCRIPT_PREFIX}--gmaps {
      background: #0b8043;
    }
    .${SCRIPT_PREFIX}--gaia {
      background: #f7b233;
      color: #000000 !important;
    }
    .${SCRIPT_PREFIX}--onx {
      background: #d81e05;
    }
    .${SCRIPT_PREFIX}__icon {
      flex: none;
    }
  `);

  observeDomChanges();
  updateLink();
})();

// Copyright (C) 2026 wilmtang <wilm.tang@outlook.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

// ==UserScript==
// @name         Fix New Yorker Audio Player Scroll
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      1.4
// @description  Prevents the New Yorker page from scrolling back to the audio player when media keys are pressed.
// @author       wilmtang
// @license      AGPL-3.0-or-later
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/NewYorker
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @updateURL    https://update.greasyfork.org/scripts/580092/Fix%20New%20Yorker%20Audio%20Player%20Scroll.meta.js
// @downloadURL  https://update.greasyfork.org/scripts/580092/Fix%20New%20Yorker%20Audio%20Player%20Scroll.user.js
// @match        *://*.newyorker.com/*
// @match        *://newyorker.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=newyorker.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Entry point: patch now, and again on the iframe's next load.
    // When an iframe is first inserted, contentWindow is the initial
    // about:blank document; it is replaced (with a fresh HTMLElement
    // prototype) once the iframe navigates to the real player src, which
    // would discard a patch applied too early. Re-patching on 'load' fixes
    // that timing window.
    function patchIframeFocus(iframe) {
        if (!iframe) return;
        applyFocusPatch(iframe);
        if (!iframe.__focusLoadHooked) {
            iframe.__focusLoadHooked = true;
            iframe.addEventListener('load', () => applyFocusPatch(iframe));
        }
    }

    function applyFocusPatch(iframe) {
        try {
            const iframeWin = iframe.contentWindow;
            // If already patched or not accessible, skip
            if (!iframeWin || iframeWin.__focusPatched) return;

            const originalFocus = iframeWin.HTMLElement.prototype.focus;
            iframeWin.HTMLElement.prototype.focus = function(...args) {
                // Force preventScroll to true to stop native browser auto-scroll
                if (args.length === 0 || !args[0] || args[0].preventScroll !== true) {
                    return originalFocus.call(this, { preventScroll: true });
                }
                return originalFocus.apply(this, args);
            };
            iframeWin.__focusPatched = true;
            console.log("[New Yorker Audio Fix] Patched audio player iframe focus to prevent scroll.");
        } catch (e) {
            // Most likely a cross-origin embed: we cannot reach into its
            // window object. Surface it once instead of failing silently, so
            // it's clear why scroll-prevention isn't taking effect here.
            if (!iframe.__focusPatchWarned) {
                iframe.__focusPatchWarned = true;
                console.warn(
                    "[New Yorker Audio Fix] Could not patch the audio player iframe " +
                    "(likely cross-origin); scroll-prevention may not apply on this embed.",
                    e && e.name ? "(" + e.name + ")" : ""
                );
            }
        }
    }

    // Attempt to patch immediately if already present
    const existingIframe = document.querySelector('[data-testid="cne-audio-embed-target"] iframe');
    if (existingIframe) {
        patchIframeFocus(existingIframe);
    }

    // Observer to catch the iframe if it's injected dynamically
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === 'IFRAME' && node.closest('[data-testid="cne-audio-embed-target"]')) {
                        patchIframeFocus(node);
                    } else if (node.querySelector) {
                        const iframe = node.querySelector('[data-testid="cne-audio-embed-target"] iframe');
                        if (iframe) {
                            patchIframeFocus(iframe);
                        }
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

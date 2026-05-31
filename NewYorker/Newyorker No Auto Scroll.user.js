// ==UserScript==
// @name         Fix New Yorker Audio Player Scroll
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      1.2
// @description  Prevents the New Yorker page from scrolling back to the audio player when media keys are pressed.
// @author       wilmtang
// @license      MIT
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

    // Function to patch the iframe's focus method
    function patchIframeFocus(iframe) {
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
            // Ignore cross-origin errors if any
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

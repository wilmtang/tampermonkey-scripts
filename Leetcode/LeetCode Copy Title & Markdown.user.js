// ==UserScript==
// @name         LeetCode Copy Title & Markdown
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      2.5
// @description  Adds LeetCode copy helpers and preserves SPA browser history
// @author       wilmtang
// @license      MIT
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/Leetcode
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @updateURL    https://update.greasyfork.org/scripts/580093/LeetCode%20Copy%20Title%20%20Markdown.meta.js
// @downloadURL  https://update.greasyfork.org/scripts/580093/LeetCode%20Copy%20Title%20%20Markdown.user.js
// @match        *://leetcode.com/*
// @match        *://www.leetcode.com/*
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @require      https://unpkg.com/turndown@7.2.4/dist/turndown.js
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const CONTAINER_ID = 'lc-copy-btns-container';
    const URL_CHANGE_EVENT = 'lc-copy-title-markdown:urlchange';
    let lastInjectedTitle = null;
    let lastUrl = location.href;
    let titleSelectionHandlersInstalled = false;
    let buttonObserver = null;

    // --- Selectability CSS & Event Blockers ---
    function makeTitleSelectable() {
        if (!document.head) return;

        if (!document.getElementById('lc-selectable-style')) {
            const style = document.createElement('style');
            style.id = 'lc-selectable-style';
            style.innerHTML = `
                .text-title-large,
                .text-title-large * {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                    cursor: text !important;
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(style);
        }

        if (titleSelectionHandlersInstalled) return;
        titleSelectionHandlersInstalled = true;

        const stopDragCancel = function(e) {
            let target = e.target;
            while (target && target !== document.body) {
                if (target.classList && target.classList.contains('text-title-large')) {
                    if (e.type === 'dragstart') e.preventDefault(); 
                    else e.stopPropagation(); 
                    break;
                }
                target = target.parentNode;
            }
        };

        document.addEventListener('mousedown', stopDragCancel, true);
        document.addEventListener('selectstart', stopDragCancel, true);
        document.addEventListener('dragstart', stopDragCancel, true);
    }

    // --- NEW in 2.1: Destroy Link Behavior ---
    // This stops the browser from treating the middle of the text as a draggable URL
    function neutralizeLink(el) {
        if (!el) return;
        
        // If the element itself is the anchor tag
        if (el.tagName === 'A') {
            el.removeAttribute('href');
        } 
        
        // If the element contains an anchor tag
        const childA = el.querySelector('a');
        if (childA) {
            childA.removeAttribute('href');
        }
    }


    // --- Helper: Creates the standardized buttons ---
    function createButtonBase(title, text) {
        const btn = document.createElement('button');
        btn.title = title;
        btn.textContent = text;
        btn.style.cssText = `
            padding: 2px 8px;
            font-size: 14px;
            cursor: pointer;
            background: transparent;
            border: 1px solid #888;
            border-radius: 6px;
            color: inherit;
            transition: background 0.15s, border-color 0.15s;
            line-height: 1.4;
            opacity: 0.7;
        `;

        btn.addEventListener('mouseenter', () => {
            btn.style.opacity = '1';
            btn.style.borderColor = '#ffa116';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.opacity = '0.7';
            btn.style.borderColor = '#888';
        });

        return btn;
    }

    // --- Helper: Success Animation ---
    function triggerSuccessAction(btn, originalText) {
        btn.textContent = '✅';
        btn.style.borderColor = '#00b894';
        btn.style.opacity = '1';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.borderColor = '#888';
            btn.style.opacity = '0.7';
        }, 1500);
    }

    // --- Helper: Copy logic fallback ---
    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
        } else {
            navigator.clipboard.writeText(text).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            });
        }
    }

    function stripProblemNumber(title) {
        return title.replace(/^\d+\.\s*/, '').trim();
    }

    // --- Button 1: Copy Title ---
    function createCopyTitleButton() {
        const btn = createButtonBase('Copy title to clipboard', '📋');
        btn.id = 'lc-copy-title-btn';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentTitle = stripProblemNumber((findTitleEl()?.textContent ?? '').trim());
            if (!currentTitle) return;

            copyToClipboard(currentTitle);
            triggerSuccessAction(btn, '📋');
        });

        return btn;
    }

    // --- Button 2: Copy Full Markdown ---
    function createCopyMdButton() {
        const btn = createButtonBase('Copy problem to Markdown', 'M↓');
        btn.id = 'lc-copy-md-btn';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();

            const titleEl = findTitleEl();
            const descEl = findDescriptionEl();
            if (!titleEl || !descEl) {
                alert("Could not find the problem description on the page.");
                return;
            }

            const titleText = titleEl.textContent.trim();

            // Build the canonical problem URL from the slug. Splitting on
            // '/description' broke on other sub-tabs (solutions/submissions/
            // editorial), producing '/problems/<slug>/<tab>//description/'.
            const slugMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
            const url = slugMatch
                ? `${window.location.origin}/problems/${slugMatch[1]}/description/`
                : window.location.href;

            let mdContent = convertToMarkdown(descEl.innerHTML);
            mdContent = mdContent.replace(/\u200B/g, '');
            mdContent = mdContent.split('\n').map(line => '> ' + line).join('\n');

            const finalMd = `# ${titleText}\n${url}\n${mdContent}\n`;

            copyToClipboard(finalMd);
            triggerSuccessAction(btn, 'M↓');
        });

        return btn;
    }

    // --- HTML to Markdown Conversion Logic ---
    function convertToMarkdown(html) {
        if (typeof TurndownService === 'undefined') {
            alert("Markdown library failed to load. Check Tampermonkey permissions for @require.");
            return 'Error: Turndown library failed to load.';
        }

        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });

        turndownService.addRule('katex', {
            filter: function (node) {
                return node.classList && node.classList.contains('katex');
            },
            replacement: function (content, node) {
                const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
                if (annotation) {
                    const tex = annotation.textContent.trim();
                    const isDisplay = node.classList.contains('katex-display') ||
                                      (node.parentNode && node.parentNode.classList.contains('katex-display'));
                    return isDisplay ? `\n$$\n${tex}\n$$\n` : `$${tex}$`;
                }
                return node.textContent;
            }
        });

        turndownService.addRule('sup', {
            filter: 'sup',
            replacement: function (content) { return `^${content}`; }
        });
        turndownService.addRule('sub', {
            filter: 'sub',
            replacement: function (content) { return `_${content}`; }
        });

        turndownService.addRule('pre', {
            filter: 'pre',
            replacement: function (content, node) {
                const code = node.textContent || '';
                return `\n\`\`\`\n${code.trim()}\n\`\`\`\n`;
            }
        });

        turndownService.addRule('hidden', {
            filter: function(node) {
                return node.classList && (node.classList.contains('hide') || node.classList.contains('sr-only'));
            },
            replacement: function() { return ''; }
        });

        return turndownService.turndown(html);
    }

    // --- Ultra-Aggressive Element Selectors ---
    function findTitleEl() {
        let el = document.querySelector('.text-title-large a') || document.querySelector('.text-title-large');
        if (el) return el;

        const selectors = [
            'div[data-cy="question-title"]',
            'h1[data-cy="question-title"]',
            'h1.mr-2',
            '.question-title h3'
        ];
        for (const sel of selectors) {
            el = document.querySelector(sel);
            if (el) return el;
        }

        const allHeadings = document.querySelectorAll('h1, a, div');
        for (const elem of allHeadings) {
            if (/^\d+\.\s/.test(elem.textContent.trim())) {
                if (elem.tagName === 'H1' || elem.classList.contains('text-title-large')) {
                    return elem;
                }
            }
        }

        return null;
    }

    function findDescriptionEl() {
        const selectors = [
            'div[data-track-load="description_content"]',
            '.content__u3I1',
            '.question-content',
            '[data-track-load="description_content"]'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    // --- Core Injection Logic ---
    function injectButtons() {
        if (!/\/problems\/.+/.test(location.pathname)) return;

        const titleEl = findTitleEl();
        if (!titleEl) return;
        
        // Strip the link behavior so the middle is selectable
        neutralizeLink(titleEl);

        const titleText = titleEl.textContent.trim();
        if (!titleText) return;

        let container = document.getElementById(CONTAINER_ID);

        if (container && lastInjectedTitle === titleText) return;
        if (container) container.remove();

        container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.style.cssText = `
            display: inline-flex;
            gap: 8px;
            margin-left: 10px;
            vertical-align: middle;
        `;

        const titleBtn = createCopyTitleButton();
        const mdBtn = createCopyMdButton();

        container.appendChild(titleBtn);
        container.appendChild(mdBtn);

        titleEl.insertAdjacentElement('afterend', container);

        lastInjectedTitle = titleText;
        lastUrl = location.href;
    }

    // Watch for SPA navigations via URL changes
    function onUrlChange() {
        if (location.href !== lastUrl) {
            lastInjectedTitle = null;
            lastUrl = location.href;
            injectButtons(); 
        }
    }

    function installHistoryShimOnWindow(win, eventName) {
        if (win.__lcCopyTitleMarkdownHistoryShimInstalled) return;
        win.__lcCopyTitleMarkdownHistoryShimInstalled = true;

        let isHandlingPopstate = false;
        const pushState = win.history.pushState.bind(win.history);
        const replaceState = win.history.replaceState.bind(win.history);
        const notify = () => {
            win.dispatchEvent(new win.CustomEvent(eventName, { detail: { href: win.location.href } }));
        };

        function getUrlFromHistoryArgs(args) {
            if (args.length < 3 || args[2] == null) return null;
            return new win.URL(args[2], win.location.href).href;
        }

        win.history.pushState = function (...args) {
            const result = pushState(...args);
            notify();
            return result;
        };

        // LeetCode sometimes changes SPA routes with replaceState, which prevents
        // Back from returning to the previous URL. Push distinct URLs instead.
        win.history.replaceState = function (...args) {
            const targetUrl = getUrlFromHistoryArgs(args);
            const result = targetUrl && targetUrl !== win.location.href && !isHandlingPopstate
                ? pushState(...args)
                : replaceState(...args);
            notify();
            return result;
        };

        win.addEventListener('popstate', () => {
            isHandlingPopstate = true;
            win.setTimeout(() => {
                isHandlingPopstate = false;
            }, 0);
            notify();
        }, true);
        win.addEventListener('hashchange', notify);
    }

    function installPageHistoryShim() {
        try {
            const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            installHistoryShimOnWindow(pageWindow, URL_CHANGE_EVENT);
        } catch (_err) {}

        const root = document.documentElement || document.head || document.body;
        if (!root) {
            window.addEventListener('DOMContentLoaded', installPageHistoryShim, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.textContent = `(${installHistoryShimOnWindow.toString()})(window, ${JSON.stringify(URL_CHANGE_EVENT)});`;
        root.appendChild(script);
        script.remove();
    }

    installPageHistoryShim();
    window.addEventListener(URL_CHANGE_EVENT, onUrlChange);
    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('hashchange', onUrlChange);

    function startDomFeatures() {
        makeTitleSelectable();
        injectButtons();

        if (!buttonObserver && document.body) {
            buttonObserver = new MutationObserver(() => injectButtons());
            buttonObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    startDomFeatures();
    window.addEventListener('DOMContentLoaded', startDomFeatures);
    window.addEventListener('load', startDomFeatures);
    setTimeout(startDomFeatures, 250);
    setTimeout(startDomFeatures, 1000);
    setTimeout(startDomFeatures, 2500);
    setTimeout(startDomFeatures, 5000);
})();

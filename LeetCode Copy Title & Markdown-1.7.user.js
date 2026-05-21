// ==UserScript==
// @name         LeetCode Copy Title & Markdown
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adds buttons to copy the title/description to Markdown, and makes the title selectable
// @author       You
// @match        https://leetcode.com/problems/*/
// @match        https://leetcode.com/problems/*/description/
// @match        https://leetcode.com/problems/*/*
// @grant        GM_setClipboard
// @require      https://unpkg.com/turndown/lib/turndown.browser.umd.js
// ==/UserScript==

(function () {
    'use strict';

    const CONTAINER_ID = 'lc-copy-btns-container';
    let lastInjectedTitle = null;
    let lastPathname = null;

    // --- NEW in 2.0: Prevent Native Anchor Dragging ---
    function makeTitleSelectable() {
        if (document.getElementById('lc-selectable-style')) return;
        
        // 1. Force CSS rules on the title AND all its child elements
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

        // 2. Intercept and block both React's drag cancel AND the browser's native link dragging
        const stopDragCancel = function(e) {
            let target = e.target;
            while (target && target !== document.body) {
                if (target.classList && target.classList.contains('text-title-large')) {
                    if (e.type === 'dragstart') {
                        // This stops the browser from showing the "ghost link" image
                        e.preventDefault(); 
                    } else {
                        // This stops React from canceling the text selection
                        e.stopPropagation(); 
                    }
                    break;
                }
                target = target.parentNode;
            }
        };

        // Listen during the capture phase (true) to intercept before other scripts
        document.addEventListener('mousedown', stopDragCancel, true);
        document.addEventListener('selectstart', stopDragCancel, true);
        document.addEventListener('dragstart', stopDragCancel, true); // Added dragstart listener
    }

    // Run immediately to ensure text is selectable as soon as page loads
    makeTitleSelectable();


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

    // --- Button 1: Copy Title ---
    function createCopyTitleButton() {
        const btn = createButtonBase('Copy title to clipboard', '📋');
        btn.id = 'lc-copy-title-btn';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentTitle = (findTitleEl()?.textContent ?? '').trim();
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

            const cleanPathname = window.location.pathname.split('/description')[0] + '/description/';
            const url = window.location.origin + cleanPathname;

            // 1. Convert DOM HTML to Markdown using Turndown
            let mdContent = convertToMarkdown(descEl.innerHTML);

            // 2. Clean up invisible zero-width spaces LeetCode sometimes uses
            mdContent = mdContent.replace(/\u200B/g, '');

            // 3. Nest the ENTIRE problem description inside a blockquote
            mdContent = mdContent.split('\n').map(line => '> ' + line).join('\n');

            // 4. Format: Title -> URL on next line -> Content (no gap) -> Trailing newline
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
        // 1. Direct class match for modern LeetCode UI
        let el = document.querySelector('.text-title-large a') || document.querySelector('.text-title-large');
        if (el) return el;

        // 2. Fallback to older/alternative UI layouts
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

        // 3. Failsafe: Find ANY H1 or Link that starts with a number and a dot
        const allHeadings = document.querySelectorAll('h1, a, div');
        for (const elem of allHeadings) {
            if (/^\d+\.\s/.test(elem.textContent.trim())) {
                // Ensure it's roughly title-sized to avoid grabbing descriptions by accident
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

        const titleText = titleEl.textContent.trim();
        if (!titleText) return;

        let container = document.getElementById(CONTAINER_ID);

        // If buttons are already there and title hasn't changed, ignore
        if (container && lastInjectedTitle === titleText) return;

        // Cleanup old instance on SPA nav
        if (container) container.remove();

        // Create flex container so both buttons sit nicely next to each other
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
        lastPathname = location.pathname;
    }

    // Watch for SPA navigations via URL changes
    function onUrlChange() {
        if (location.pathname !== lastPathname) {
            lastInjectedTitle = null;
            lastPathname = location.pathname;
            injectButtons(); // Try immediately on route change
        }
    }

    const _pushState = history.pushState.bind(history);
    history.pushState = function (...args) {
        _pushState(...args);
        onUrlChange();
    };
    window.addEventListener('popstate', onUrlChange);

    // MutationObserver handles lazy DOM rendering
    const observer = new MutationObserver(() => injectButtons());
    observer.observe(document.body, { childList: true, subtree: true });

    // Staggered loading failsafe (catches slow React renders)
    window.addEventListener('load', injectButtons);
    setTimeout(injectButtons, 1000);
    setTimeout(injectButtons, 2500);
    setTimeout(injectButtons, 5000);
})();

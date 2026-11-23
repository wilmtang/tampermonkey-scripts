// Copyright (C) 2026 wilmtang <wilm.tang@outlook.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

// ==UserScript==
// @name         NeetCode Open on LeetCode
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      4.3
// @description  Adds an Open on LeetCode link beside the title on NeetCode problem pages
// @author       wilmtang
// @license      AGPL-3.0-or-later
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/NeetCode
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @match        https://neetcode.io/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const LINK_ID = 'nc-open-on-leetcode-link';
    const PROBLEM_PATH = /^\/problems\/([a-z0-9-]+)(?:\/|$)/;

    // These NeetCode display titles differ from the slugs in its problem catalog.
    const LEETCODE_SLUGS = new Map([
        ['149', 'max-points-on-a-line'],
        ['380', 'insert-delete-getrandom-o1'],
        ['446', 'arithmetic-slices-ii-subsequence'],
        ['515', 'find-largest-value-in-each-tree-row'],
        ['904', 'fruit-into-baskets'],
        ['1343', 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold'],
        ['1481', 'least-number-of-unique-integers-after-k-removals'],
        ['1611', 'minimum-one-bit-operations-to-make-integers-zero'],
        ['1863', 'sum-of-all-subset-xor-totals'],
        ['2700', 'differences-between-two-objects'],
        ['3572', 'maximize-ysum-by-picking-a-triplet-of-distinct-xvalues'],
    ]);

    function getLeetCodeUrl(title) {
        const problem = location.pathname.match(PROBLEM_PATH)?.[1];
        const canonical = document.querySelector('link[rel="canonical"][href]');
        const canonicalProblem = canonical && new URL(canonical.href).pathname.match(PROBLEM_PATH)?.[1];
        // During navigation the previous problem can remain in the DOM.
        if (!problem || problem !== canonicalProblem || !title) return null;

        const description = document.querySelector('meta[property="og:description"]')
            ?? document.querySelector('meta[name="og:description"], meta[name="description"]');
        const match = description?.content.match(/^LeetCode\s+(\d+)\.\s+([\s\S]+)/i);
        if (!match) return null;

        const summary = match[2].trim().toLowerCase();
        const heading = title.toLowerCase();
        if (summary !== heading && !summary.startsWith(`${heading} `) && !summary.startsWith(`${heading}\n`)) {
            return null;
        }

        const slug = LEETCODE_SLUGS.get(match[1]) ?? heading
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/[\s-]+/g, '-')
            .replace(/^-|-$/g, '');
        return slug ? `https://leetcode.com/problems/${slug}/` : null;
    }

    function createLink(url) {
        const link = document.createElement('a');
        link.id = LINK_ID;
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open on LeetCode';
        link.style.cssText = `
            display: inline-flex;
            align-items: center;
            margin-inline-start: 8px;
            padding: 4px 12px;
            font-size: 13px;
            font-weight: 500;
            border: 1px solid #f89f1b;
            border-radius: 6px;
            color: #b65c00;
            background: #fff5e5;
            line-height: 1.5;
            white-space: nowrap;
        `;
        return link;
    }

    function updateLink() {
        const title = document.querySelector('h1.problem-title');
        const url = getLeetCodeUrl(title?.textContent.trim());
        const link = document.getElementById(LINK_ID);
        if (url && link?.href === url && link.previousElementSibling === title) return;

        link?.remove();
        if (url) title.after(createLink(url));
    }

    const observer = new MutationObserver(updateLink);
    observer.observe(document.head, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['content', 'href'],
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.navigation?.addEventListener('currententrychange', updateLink);
    window.addEventListener('popstate', updateLink);
    updateLink();
})();

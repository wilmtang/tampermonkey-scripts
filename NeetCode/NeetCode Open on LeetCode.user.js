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

    // NeetCode's problem catalog pairs these custom route slugs with LeetCode slugs.
    const LEETCODE_SLUGS = new Map([
        ['anagram-groups', 'group-anagrams'],
        ['binary-tree-diameter', 'diameter-of-binary-tree'],
        ['binary-tree-from-preorder-and-inorder-traversal', 'construct-binary-tree-from-preorder-and-inorder-traversal'],
        ['buy-and-sell-crypto', 'best-time-to-buy-and-sell-stock'],
        ['buy-and-sell-crypto-with-cooldown', 'best-time-to-buy-and-sell-stock-with-cooldown'],
        ['cheapest-flight-path', 'cheapest-flights-within-k-stops'],
        ['combination-target-sum', 'combination-sum'],
        ['combination-target-sum-ii', 'combination-sum-ii'],
        ['combinations-of-a-phone-number', 'letter-combinations-of-a-phone-number'],
        ['copy-linked-list-with-random-pointer', 'copy-list-with-random-pointer'],
        ['count-connected-components', 'number-of-connected-components-in-an-undirected-graph'],
        ['count-number-of-islands', 'number-of-islands'],
        ['count-paths', 'unique-paths'],
        ['count-squares', 'detect-squares'],
        ['count-subsequences', 'distinct-subsequences'],
        ['depth-of-binary-tree', 'maximum-depth-of-binary-tree'],
        ['design-twitter-feed', 'design-twitter'],
        ['design-word-search-data-structure', 'design-add-and-search-words-data-structure'],
        ['duplicate-integer', 'contains-duplicate'],
        ['eating-bananas', 'koko-eating-bananas'],
        ['find-duplicate-integer', 'find-the-duplicate-number'],
        ['find-median-in-a-data-stream', 'find-median-from-data-stream'],
        ['find-target-in-rotated-sorted-array', 'search-in-rotated-sorted-array'],
        ['foreign-dictionary', 'alien-dictionary'],
        ['implement-prefix-tree', 'implement-trie-prefix-tree'],
        ['insert-new-interval', 'insert-interval'],
        ['invert-a-binary-tree', 'invert-binary-tree'],
        ['is-anagram', 'valid-anagram'],
        ['is-palindrome', 'valid-palindrome'],
        ['islands-and-treasure', 'walls-and-gates'],
        ['kth-largest-integer-in-a-stream', 'kth-largest-element-in-a-stream'],
        ['kth-smallest-integer-in-bst', 'kth-smallest-element-in-a-bst'],
        ['level-order-traversal-of-binary-tree', 'binary-tree-level-order-traversal'],
        ['linked-list-cycle-detection', 'linked-list-cycle'],
        ['longest-increasing-path-in-matrix', 'longest-increasing-path-in-a-matrix'],
        ['longest-repeating-substring-with-replacement', 'longest-repeating-character-replacement'],
        ['longest-substring-without-duplicates', 'longest-substring-without-repeating-characters'],
        ['lowest-common-ancestor-in-binary-search-tree', 'lowest-common-ancestor-of-a-binary-search-tree'],
        ['max-water-container', 'container-with-most-water'],
        ['meeting-schedule', 'meeting-rooms'],
        ['meeting-schedule-ii', 'meeting-rooms-ii'],
        ['merge-k-sorted-linked-lists', 'merge-k-sorted-lists'],
        ['merge-triplets-to-form-target', 'merge-triplets-to-form-target-triplet'],
        ['merge-two-sorted-linked-lists', 'merge-two-sorted-lists'],
        ['min-cost-to-connect-points', 'min-cost-to-connect-all-points'],
        ['minimum-interval-including-query', 'minimum-interval-to-include-each-query'],
        ['minimum-stack', 'min-stack'],
        ['minimum-window-with-characters', 'minimum-window-substring'],
        ['non-cyclical-number', 'happy-number'],
        ['number-of-one-bits', 'number-of-1-bits'],
        ['permutation-string', 'permutation-in-string'],
        ['pow-x-n', 'powx-n'],
        ['products-of-array-discluding-self', 'product-of-array-except-self'],
        ['reconstruct-flight-path', 'reconstruct-itinerary'],
        ['remove-node-from-end-of-linked-list', 'remove-nth-node-from-end-of-list'],
        ['reorder-linked-list', 'reorder-list'],
        ['reverse-a-linked-list', 'reverse-linked-list'],
        ['rotate-matrix', 'rotate-image'],
        ['rotting-fruit', 'rotting-oranges'],
        ['same-binary-tree', 'same-tree'],
        ['search-2d-matrix', 'search-a-2d-matrix'],
        ['search-for-word', 'word-search'],
        ['search-for-word-ii', 'word-search-ii'],
        ['set-zeroes-in-matrix', 'set-matrix-zeroes'],
        ['string-encode-and-decode', 'encode-and-decode-strings'],
        ['subtree-of-a-binary-tree', 'subtree-of-another-tree'],
        ['task-scheduling', 'task-scheduler'],
        ['three-integer-sum', '3sum'],
        ['top-k-elements-in-list', 'top-k-frequent-elements'],
        ['two-integer-sum', 'two-sum'],
        ['two-integer-sum-ii', 'two-sum-ii-input-array-is-sorted'],
        ['valid-binary-search-tree', 'validate-binary-search-tree'],
        ['valid-tree', 'graph-valid-tree'],
        ['validate-parentheses', 'valid-parentheses'],
    ]);

    function getLeetCodeUrl(title) {
        const problem = location.pathname.match(PROBLEM_PATH)?.[1];
        const canonical = document.querySelector('link[rel="canonical"][href]');
        const canonicalProblem = canonical && new URL(canonical.href).pathname.match(PROBLEM_PATH)?.[1];
        // During navigation the previous problem can remain in the DOM.
        if (!problem || problem !== canonicalProblem || !title) return null;

        const description = document.querySelector('meta[property="og:description"]')
            ?? document.querySelector('meta[name="og:description"], meta[name="description"]');
        if (!/^LeetCode\s+\d+\.\s+/i.test(description?.content ?? '')) return null;

        const pageTitle = document.querySelector('meta[property="og:title"]')?.content.trim();
        if (pageTitle !== `${title} - NeetCode`) return null;

        const slug = LEETCODE_SLUGS.get(problem) ?? problem;
        return `https://leetcode.com/problems/${slug}/`;
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

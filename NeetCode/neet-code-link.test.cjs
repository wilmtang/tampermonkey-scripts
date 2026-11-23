const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(path.join(__dirname, 'NeetCode Open on LeetCode.user.js'), 'utf8');
const LINK_ID = 'nc-open-on-leetcode-link';

function loadProblem({ slug, title, description }) {
    const state = {
        heading: title,
        metadata: { content: description },
        canonical: { href: `https://neetcode.io/problems/${slug}/question` },
    };
    const location = new URL(state.canonical.href);
    let link;
    let onMutation;
    const titleElement = {
        get textContent() { return state.heading; },
        after(element) {
            element.previousElementSibling = this;
            link = element;
        },
    };

    runInNewContext(source, {
        URL,
        location,
        window: new EventTarget(),
        document: {
            head: {},
            body: {},
            querySelector(selector) {
                if (selector === 'h1.problem-title') return titleElement;
                if (selector.startsWith('link[rel=')) return state.canonical;
                if (selector === 'meta[property="og:description"]') return state.metadata;
                return null;
            },
            getElementById: (id) => id === LINK_ID ? link : null,
            createElement(tagName) {
                assert.equal(tagName, 'a');
                return { style: {}, remove() { link = undefined; } };
            },
        },
        MutationObserver: class {
            constructor(callback) { onMutation = callback; }
            observe() {}
        },
    });
    return { state, location, onMutation, get link() { return link; } };
}

test('uses the title from the heading when Open Graph metadata includes description text', () => {
    const page = loadProblem({
        slug: 'two-integer-sum',
        title: 'Two Sum',
        description: 'Leetcode 1. Two Sum Given an array of integers…',
    });
    assert.equal(page.link.href, 'https://leetcode.com/problems/two-sum/');
    assert.equal(page.link.target, '_blank');
    const originalLink = page.link;
    page.onMutation();
    assert.equal(page.link, originalLink);
});

test('uses the catalog slug when the title does not match it', () => {
    const page = loadProblem({
        slug: 'insert-delete-getrandom-o1',
        title: 'Insert Delete Get Random O(1)',
        description: 'Leetcode 380. Insert Delete Get Random O(1) Implement the RandomizedSet class…',
    });
    assert.equal(page.link.href, 'https://leetcode.com/problems/insert-delete-getrandom-o1/');
});

test('removes the stale link while the next problem loads and restores it when the page is ready', () => {
    const page = loadProblem({
        slug: 'two-integer-sum',
        title: 'Two Sum',
        description: 'Leetcode 1. Two Sum Given an array of integers…',
    });
    page.location.pathname = '/problems/anagram-groups/question';
    page.onMutation();
    assert.equal(page.link, undefined);

    page.state.canonical.href = page.location.href;
    page.state.metadata.content = 'Leetcode 49. Group Anagrams Given an array of strings…';
    page.onMutation();
    assert.equal(page.link, undefined);

    page.state.heading = 'Group Anagrams';
    page.onMutation();
    assert.equal(page.link.href, 'https://leetcode.com/problems/group-anagrams/');

    page.location.pathname = '/roadmap';
    page.onMutation();
    assert.equal(page.link, undefined);
});

test('omits the link when the problem has no LeetCode metadata', () => {
    const page = loadProblem({
        slug: 'neet-code-exclusive',
        title: 'NeetCode Exclusive',
        description: 'A practice problem on NeetCode.',
    });
    assert.equal(page.link, undefined);
});

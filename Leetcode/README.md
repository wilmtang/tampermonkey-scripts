# LeetCode Copy Title & Markdown

[![Greasy Fork installs](https://img.shields.io/badge/dynamic/json?label=users&query=$.total_installs&url=https%3A%2F%2Fgreasyfork.org%2Fen%2Fscripts%2F580093.json&color=2ea44f)](https://greasyfork.org/en/scripts/580093-leetcode-copy-title-markdown)
[![Install from Greasy Fork](https://img.shields.io/badge/install-Greasy%20Fork-blue)](https://update.greasyfork.org/scripts/580093/LeetCode%20Copy%20Title%20%20Markdown.user.js)

A userscript that adds copy helpers to LeetCode problem pages and keeps LeetCode SPA URL changes in browser history.

## Features

- Adds a button to copy the problem title.
- Adds a button to copy the problem description as Markdown.
- Makes the problem title selectable so it can be copied normally.
- Works across LeetCode problem, description, and nested problem routes.
- Preserves browser history for LeetCode SPA URL changes so Back can return to previously visited URLs.

## Supported Pages

- History preservation: `https://leetcode.com/*`
- Copy helpers: `https://leetcode.com/problems/*/`
- Copy helpers: `https://leetcode.com/problems/*/description/`
- Copy helpers: `https://leetcode.com/problems/*/*`

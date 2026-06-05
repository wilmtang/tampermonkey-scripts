# AI Copy Cleaner for Obsidian

[![Install local userscript](https://img.shields.io/badge/install-local%20userscript-blue)](AI%20Copy%20Cleaner%20for%20Obsidian.user.js)

A Tampermonkey userscript that cleans copied AI-answer HTML before it reaches Obsidian.

## What It Fixes

Gemini renders nested lists tightly with CSS, but the DOM behind the visible text looks like this:

```html
<li>
  <p><b>Card <code>1</code>:</b> No piles exist. Start Pile 1.</p>
  <ul>
    <li><p>Pile 1 top: <code>1</code></p></li>
  </ul>
</li>
```

When Obsidian receives that HTML, it often treats the `<p>` inside `<li>` as a loose list item and inserts blank vertical space. Paste with matching style still carries enough structure for the extra gaps to appear.

## How The Script Works

`AI Copy Cleaner for Obsidian.user.js` intercepts normal copy events on Gemini, ChatGPT, ChatGPT legacy URLs, and Claude. For non-editable selections it replaces the clipboard payload with:

- tight Markdown in `text/plain` and `text/markdown`
- simplified tight HTML in `text/html`

That means normal paste and paste-with-matching-style both get list markup that Obsidian can render without the stray blank lines.

## Use

Install `AI Copy Cleaner for Obsidian.user.js` in Tampermonkey, then copy from supported AI pages normally with `Command+C`.

There is also a fallback shortcut:

```text
Option+Shift+C
```

It copies the current selection through the same cleaner even if a page-specific copy handler interferes.

## Supported Pages

- `https://gemini.google.com/*`
- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://claude.ai/*`

## Current Scope

The converter preserves common AI answer formatting: headings, paragraphs, bold, italic, inline code, code blocks, links, blockquotes, ordered/unordered lists, nested lists, and simple tables.

It intentionally skips page controls such as buttons, icons, inputs, scripts, and SVGs so copied answers do not bring UI text into Obsidian.

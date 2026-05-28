# Fix New Yorker Audio Player Scroll

[![Greasy Fork](https://img.shields.io/badge/Greasy%20Fork-pending-lightgrey)](https://greasyfork.org/en/users/1606863-wilmtang)
[![Install from GitHub](https://img.shields.io/badge/install-GitHub-blue)](https://raw.githubusercontent.com/wilmtang/tampermonkey-scripts/main/NewYorker/Newyorker%20No%20Auto%20Scroll.user.js)

## The New Yorker Audio Player Scrolling Bug

**The Problem:**
When reading an article on The New Yorker that contains an embedded audio player, pressing a hardware media key (Play/Pause) causes the webpage to forcefully scroll the viewport back to the audio player.

**Technical Investigation Findings:**
1. **Architecture:** The audio player is embedded within an iframe (`embed-audio.cnevids.com`) inside a container `div` (`[data-testid="cne-audio-embed-target"]`). The older wrapper (`[class*="podcast-episode-player-embed__playerContainer"]`) no longer exists.
2. **The Bug:** The iframe handles the OS-level Media Session API (`navigator.mediaSession`). When you press a media key, the iframe script calls `.focus()` on its own play/pause button. 
3. **The Trigger:** Because the button is inside an iframe, calling `.focus()` triggers the browser's native behavior to immediately scroll the parent window so the iframe is brought into view.

**The Solution:**
Because the iframe is same-origin (its src is dynamically injected same-origin), we can safely access `iframe.contentWindow`. By intercepting the `focus` method on elements inside the iframe, we can pass `{ preventScroll: true }` to stop the browser's native auto-scroll behavior while allowing the audio player to handle the play/pause state correctly.

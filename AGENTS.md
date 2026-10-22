# Repository Instructions for AI Agents

This repository contains Tampermonkey/Greasemonkey userscripts that are published on Greasy Fork and synced from GitHub.

When creating a new userscript, ask the user before publishing it externally:

> Do you want me to publish this new script on Greasy Fork and configure the same GitHub sync/webhook workflow as the existing scripts?

If the user says yes, follow the existing pattern:

1. Create the script as `*.user.js`.
2. Add clean metadata:
   - `@name`
   - `@namespace https://github.com/wilmtang/tampermonkey-scripts`
   - `@version`
   - `@description`
   - `@author wilmtang`
   - `@license AGPL-3.0-or-later`
   - `@homepageURL`
   - `@supportURL https://github.com/wilmtang/tampermonkey-scripts/issues`
   - `@match`
   - required `@grant` and pinned `@require` entries
3. Add a script README.
4. Publish the script to Greasy Fork only after user approval.
5. Configure Greasy Fork source sync to the raw GitHub `main` URL for the `.user.js` file.
6. Configure Greasy Fork additional-info sync to the raw GitHub `main` URL for the script README.
7. Confirm the existing GitHub webhook is still active and successfully delivering push events to Greasy Fork.
8. Add Greasy Fork install links and dynamic Shields install-count badges to the root README and script README.

For code changes to an existing script, bump `@version` before pushing. Greasy Fork sync and userscript manager updates depend on the version changing.

## Commit discipline

When making code changes, commit each completed independent unit of work before starting another. Keep every commit focused and do not bundle unrelated changes. Run checks appropriate to the change before committing; do not commit knowingly broken or incomplete work merely to satisfy this rule. Preserve unrelated user-owned working-tree changes unless the user explicitly asks to include them. Commits must follow the explanatory Claude Code style: use a lowercase Conventional Commit subject — `<type>: <concise lowercase summary>` — and add a body only when it records context, constraints, or verification the subject can't convey. When a body is warranted, identify the concrete module-level changes, call out intentionally preserved exceptions or boundaries, and end with the checks actually run and their results. Pass multi-paragraph bodies with repeated `-m` arguments or `-F`; never embed literal `\n` escapes in a shell argument, and inspect `git log -1 --format=raw` before moving on. A parenthesized step label is appropriate only when the work is part of an explicitly numbered migration or plan. Do not claim verification that did not occur.

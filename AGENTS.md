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
   - `@license MIT`
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

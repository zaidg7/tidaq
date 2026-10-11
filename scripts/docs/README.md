# Docs tooling

`build-pdf.mjs` regenerates `docs/Tidaq-Build-Plan.pdf` from the markdown docs. Run it after changing PLAN, TASKS, ZAID, DESIGN, DECISIONS or CLAUDE.md in a meaningful way (not for every status change).

```
pnpm add -D -w marked@12 playwright   # once the workspace exists (C-001)
pnpm exec playwright install chromium # or set CHROMIUM_PATH
node scripts/docs/build-pdf.mjs
```

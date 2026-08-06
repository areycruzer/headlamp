# Success Snackbar Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise white success-snackbar text contrast from 3.30:1 to at least 4.5:1 without changing other Headlamp colors.

**Architecture:** Override notistack's theme-independent success background in the existing application-wide `GlobalStyles`. Scope the selector to `.notistack-MuiContent-success`, leaving Headlamp's palette and every other snackbar variant untouched.

**Tech Stack:** React, TypeScript, Material UI 5, notistack 3, Vitest, ESLint, Prettier

## Global Constraints

- The final pull request changes only `frontend/src/components/App/AppContainer.tsx`.
- Use Material green 800 (`#2e7d32`), which gives white text a 5.13:1 contrast ratio.
- Do not change Headlamp's global success palette or any other snackbar variant.
- Do not add dependencies or refactor unrelated code.
- The approved spec uses browser-computed contrast verification for this CSS-only change; no new automated test file is added.

---

### Task 1: Scope an accessible background to success snackbars

**Files:**
- Modify: `frontend/src/components/App/AppContainer.tsx:143-156`

**Interfaces:**
- Consumes: notistack's stable `.notistack-MuiContent-success` class on success notification content.
- Produces: a global CSS rule setting only that class's `background-color` to `#2e7d32`.

- [ ] **Step 1: Establish a clean baseline**

Run:

```bash
npm run frontend:test -- --run frontend/src/components/App/AppContainer.test.tsx
```

Expected: the existing `AppContainer.test.tsx` tests pass.

- [ ] **Step 2: Add the scoped style rule**

Insert the selector before the existing `:root` entry:

```tsx
styles={{
  '.notistack-MuiContent-success': {
    backgroundColor: '#2e7d32',
  },
  ':root': {
```

- [ ] **Step 3: Run focused static checks**

Run:

```bash
npm run frontend:lint
npm run frontend:tsc
```

Expected: both commands exit successfully with no errors or warnings.

- [ ] **Step 4: Verify the rendered contrast**

Start the frontend:

```bash
npm run frontend:start
```

Trigger a success snackbar in light and dark themes. In browser developer tools,
confirm `.notistack-MuiContent-success` computes to white text on
`rgb(46, 125, 50)`. Confirm Axe or the contrast calculation reports at least
4.5:1; the expected ratio is 5.13:1. Capture an after screenshot for the pull
request.

- [ ] **Step 5: Review and commit the one-file diff**

Run:

```bash
git diff --check
git diff -- frontend/src/components/App/AppContainer.tsx
git add frontend/src/components/App/AppContainer.tsx
git commit -m "frontend: AppContainer: Fix success snackbar contrast"
```

Expected: the commit contains only the scoped background-color override.

- [ ] **Step 6: Publish a draft pull request**

Push the implementation branch to the contributor fork and open a draft pull
request against `kubernetes-sigs/headlamp:main`. Use `Fixes #6916`, include the
3.30:1 to 5.13:1 contrast change, exact verification commands, and before/after
screenshots.

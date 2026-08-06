# Success Snackbar Contrast Design

## Goal

Make success snackbar text meet the WCAG AA 4.5:1 contrast requirement while
keeping the change scoped to notistack success notifications.

## Root cause

Notistack 3.0.2 gives `.notistack-MuiContent-success` a hard-coded `#43a047`
background. Its white 14 px text has a 3.30:1 contrast ratio. This color does
not come from Headlamp's Material UI theme.

## Design

Add one global style override beside the existing application-wide styles in
`AppContainer.tsx`. The override will set only
`.notistack-MuiContent-success` to Material green 800 (`#2e7d32`). White text
on this background has a 5.13:1 contrast ratio.

The global success palette, snackbar text, and the default, error, warning, and
info snackbar variants remain unchanged. The same scoped color is used in all
themes because notistack's original success color is also theme-independent.

## Verification

- Run the focused frontend formatting, lint, and TypeScript checks.
- Trigger a success snackbar in both light and dark themes.
- Confirm the computed colors are white on `#2e7d32` and the contrast is at
  least 4.5:1 using Axe or browser developer tools.
- Include before and after screenshots in the pull request.

## Pull request scope

The final pull request contains only the production style change needed for
issue #6916. This design document is planning evidence and will not be included
in the pull request branch.

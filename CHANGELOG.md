# Changelog

## Alpha 0.2.0 - 2026-08-05

Presentation-layer pass closing UI gaps against the Australian simulator. The
scenario schema, validation rules and projection engine are unchanged, so a
scenario saved or exported by the previous Alpha loads unaltered.

Added:

- Light theme and a header toggle, persisted locally. Every colour, including
  the chart series, now resolves from a custom property and follows the theme.
- A resizable input panel with a draggable and keyboard-operable separator,
  persisted locally.
- A validation summary listing every current error, each entry opening its
  panel and focusing the field.
- An in-page confirmation dialog gating New and Load locally.
- Status colour on the four headline cards and a success state for alerts.
- Breakpoints at 1200px and 480px, 44px touch targets under `pointer: coarse`,
  and `prefers-reduced-motion` support.
- Explanatory text under the sidebar panel headings and an asset-class accent
  on Cash and savings.
- Collapsible lump-sum entries. Each row shows amount, description and age in a
  one-line summary that updates as you type, and opens for editing on demand.
  A row that is still missing its age or amount opens automatically.

Fixed:

- Removing a lump sum left the remaining rows carrying their original indices,
  so a later row's validation errors could attach to the wrong entry. The list
  is now re-rendered on removal, preserving which rows were open.

Changed:

- Focus rings moved from `:focus` to `:focus-visible`, so they read as a
  keyboard affordance rather than firing on every mouse click.
- Invalid fields now carry a visible border and ring, not only `aria-invalid`.
- The disclosure chevron rotates rather than swapping between two glyphs.

The release stays Alpha. Version numbering starts here so tester feedback can
be tied to a build; the previous release is retrospectively 0.1.x.

## Alpha - 2026-08-05

Added dated lump-sum withdrawals, Australian-style Income/Balance chart views,
chart-adjacent Today's/Future pounds display control, and hover details for
chart segments and spending targets. This remains an Alpha release pending
definitive feedback from UK users; no Beta designation is implied yet.

## 0.1.0 - 2026-08-04

Initial deterministic UK retirement simulator MVP for a fictional two-person
household. It models configurable salary and contributions before retirement,
State Pension income, simple private-pension drawdown, savings, cash, inflation,
annual balances, shortfalls and nominal/today's-money views.

This release deliberately excludes UK tax, National Insurance, benefits,
annuities, defined-benefit pensions, detailed pension-law rules, external
investments, fees, stochastic or Monte Carlo returns, mortality, survivor
behaviour and financial, tax, legal or pension advice.

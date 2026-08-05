# Changelog

Version numbering is independent of the release label. The project is Alpha and
stays Alpha until that is changed deliberately; reaching a particular version
number does not imply Beta.

## Alpha 0.8.0 - 2026-08-06

Resolves #19. Two problems: the inflation assumption had no stated source,
and it inflated spending but not entered incomes, so a projection got
structurally more pessimistic every year for reasons unrelated to any
modelled assumption about pension policy.

Changed:

- Inflation defaults to 2%, the Bank of England's inflation target, cited by
  name in the Returns and inflation panel and in the methodology doc. No link
  is added: the page's no-network-request guarantee, enforced by the test
  suite, stays absolute. This is still a flat manual rate, not a live figure,
  a forecast, or a near-term-versus-long-run split.
- **State Pension now inflates with the configured rate**, entered and
  treated in today's money the same way essential and preferred spending
  already are, compounding from the projection start year regardless of when
  a person starts claiming it. This is an engine change: results for any
  scenario with an active State Pension will differ from earlier Alpha
  releases, in the direction of less pessimistic long-run shortfalls, since
  State Pension income now keeps pace with the same inflation spending is
  measured against.
- Salary is unchanged: it stays a flat entered figure and is not inflated,
  since it is user-entered and stops at retirement in any case. Documented
  explicitly in the Returns and inflation panel, the model assumptions
  disclosure and the methodology doc, so the asymmetry (or lack of it, now)
  is stated rather than left for a reader to infer from behaviour.

The scenario schema and validation are unchanged. Sample-scenario defaults
change (`inflationPct` 2.5 to 2.0), which shifts the fictional starter
scenario's projected figures; this is a change to what ships as the
illustrative default, not a fix to a wrong calculation.

## Alpha 0.7.1 - 2026-08-06

Adds an adjustable divider between the chart and the table, per #11.

Not a CSS-only change: UK's chart is SVG with a `viewBox`, not a canvas, so
raising its CSS height alone would letterbox it (blank space added, plot
unchanged). The chart's `height` is now a variable the divider drives, and
both the `viewBox` and the plot geometry (gridlines, axis, bar positions) are
recomputed on every drag step and keypress, not just the CSS box.

Added:

- A horizontal divider below the chart, matching the existing vertical
  input-panel divider: `role="separator"`, draggable, and operable with the
  up/down arrow keys when focused. The chosen height is remembered on this
  device. Hidden below 600px width, where the chart already falls back to a
  fixed height, matching how the vertical divider hides below the stacking
  breakpoint.

The scenario schema and projection engine are unchanged; this is a chart
presentation change only.

## Alpha 0.7.0 - 2026-08-05

Presentation only, per #21. Deliberately scoped down from the issue's full
suggestion: per-person pension growth rates stay in People, and cash/savings
interest rates stay in Cash and savings, rather than relocating alongside AU's
Returns section. AU's Returns and inflation section is also where its
inflation-mode selector (Treasury schedule vs. manual, near-term vs. long-run)
lives, and that is a modelling decision reserved for #19, not a layout one, so
none of that came along with this change.

Added:

- A new Returns and inflation section, holding the inflation rate (moved out
  of the former Assumptions panel, otherwise unchanged in behaviour).

Changed:

- The former Assumptions panel is renamed Household and now holds only the
  two household spending targets (essential and preferred), matching AU's
  separation of household-level settings from per-person ones.
- Sidebar order now runs Scenario, People, Returns and inflation, Cash and
  savings, Drawdown order, Lump sum withdrawals, Household, closer to AU's
  own section order. Drawdown order stays where it is: it has no AU
  counterpart and is not part of this reordering (see the decision record in
  #23).

The scenario schema, `data-field` paths and validation are unchanged; this is
a markup, grouping and heading change only. The sidebar heading-order
assertion in the test suite is updated to match.

## Alpha 0.6.0 - 2026-08-05

Presentation only, per #20.

Changed:

- Person 1 and Person 2 are now one People section with both people's fields
  side by side in a two-column layout, row-aligned so a matching field (for
  example, retirement age) can be compared directly instead of scrolling
  between two stacked panels. Matches the Australian simulator's People
  section. Collapses to a single column under 480px width.

The scenario schema and validation rules are unchanged; this is a markup and
layout change only. The sidebar heading-order assertion in the test suite is
updated to match (`Person 1`, `Person 2` replaced by `People`).

## Alpha 0.5.0 - 2026-08-05

Bundles two small, related schema additions in one version bump, per #9 and
#10.

Added:

- A scenario name field at the top of the Scenario panel (#10). It is saved
  and exported with the scenario and is used to derive the export filename
  (e.g. `retire-at-60.json` instead of the fixed `uk-retirement-scenario.json`
  every export previously used).
- An enable/disable checkbox on each lump-sum withdrawal (#9), matching AU's
  treatment. A disabled withdrawal stays in the scenario and dims in the
  list, but the projection skips it entirely for that year rather than
  requiring it to be deleted and re-entered to compare a scenario with and
  without it.

Changed:

- Schema version bumped to 2. Older saved and exported scenarios still load:
  migration backfills a blank scenario name and marks any existing lump sum
  as enabled. Fixed a latent migration gap while making this change: an
  older scenario carrying an explicit prior `schemaVersion` (not just a
  missing one) is now unconditionally re-stamped to the current version
  rather than only being upgraded when the field was absent.

## Alpha 0.4.0 - 2026-08-05

Aligns the annual table with the Australian simulator's column names and
order, per the comparison in #22. Tax, means-tested benefit and
superannuation-specific columns (Tax, After tax, Franking credits, CGT, Aust.
Aged Pension, ABP min draw) stay out: they are Australian constructs with no
UK counterpart. See the decision record in #23 for the reasoning behind every
deliberate UK/AU difference.

Changed:

- Column order now runs assets first, then income, drawdown and outcome,
  matching AU. `Total assets` (the same figure previously shown last as
  `Ending balances`) now leads the row, immediately after each person's age.
- `Year / age` is split into `Year`, `{Person 1}`, `{Person 2}`, showing both
  people's ages rather than only the older person's.
- Added a per-person pension balance column (`{Person 1} pension`, `{Person 2}
  pension`), matching AU's per-person super columns. Balance columns keep a
  "balance" suffix (`Cash balance`, `Savings balance`) rather than AU's bare
  `Cash`/`Savings`, because UK also has separate per-source drawdown columns
  and a bare duplicate heading would be ambiguous between the two.
- Replaced the `Lump sum withdrawn` value column with an `Event` column
  naming the withdrawal, matching AU's treatment of one-off withdrawals as a
  labelled event rather than a value column.
- Replaced `Preferred shortfall` with a trailing `+/-` column showing `ok` or
  the shortfall amount, matching AU.

The scenario schema, validation rules and projection engine are unchanged, so
a saved or exported scenario still loads and projects the same figures; only
the table's presentation changes.

## Alpha 0.3.0 - 2026-08-05

Fixed:

- Lump-sum withdrawals were counted as household income, so a withdrawal
  displaced ordinary drawdown pound-for-pound in the year it was taken and
  every balance after that year was overstated. Withdrawals still reduce
  their source balance as before; they no longer fund the household spending
  target. This is an engine change: projected results after a lump-sum
  withdrawal will differ from earlier Alpha releases. (#17)
- The chart drew lump sums inside the stacked funding bar, and the table
  headed the column "Lump sum income", both implying the withdrawal helped
  meet the spending target. The chart now floats the lump-sum block above the
  funding stack rather than stacking it in, matching the Australian
  simulator's treatment; the table column is renamed "Lump sum withdrawn" to
  match the legend. (#18)

Changed:

- `docs/MODEL-METHODOLOGY.md` and the in-page sidebar hint and assumptions
  text now describe lump sums as one-off spending throughout, not income.

The scenario schema and validation rules are unchanged, so a saved or exported
scenario from an earlier Alpha still loads; only the projected result changes
for scenarios using lump-sum withdrawals.

## Alpha 0.2.0, hosted version added - 2026-08-05

The simulator itself is unchanged and remains **Alpha 0.2.0**. This entry covers
distribution only.

Added:

- A GitHub Pages deployment publishing `uk-retirement-simulator.html` as the
  site index, so tablet users can open the simulator by tapping a link instead
  of saving and re-opening a local file. The build copies the file and then
  compares the two, so the published copy is byte-identical to the reviewed one.
- A download link and a hosted link in the README, with a note on the one
  behavioural difference between them: the downloaded file makes no network
  requests at all, while the hosted page is served by GitHub and so exposes
  ordinary web-request metadata including the visitor IP address. Scenario
  contents are not sent to GitHub in either case.
- A regression-test workflow running the suite on pull requests and on pushes
  to `master`. The repository previously had no CI.

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

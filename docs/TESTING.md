# UK MVP testing checklist

This checklist covers the deterministic two-person UK MVP. It is verification
evidence for the current implementation, not professional financial advice or
model validation.

## Automated verification

From the repository root, run:

```powershell
node tests/uk-retirement-simulator.test.mjs
git diff --check
```

The test file verifies the self-contained HTML, schema and validation, annual
projection cutoffs, both retired and staggered retirement, staggered State
Pension starts, zero private-pension pots, savings exhaustion, cash-only
funding, preferred-versus-essential shortfall reporting, balance conservation,
today's-money conversion, lump-sum withdrawal funding, and the Income/Balance
chart view and tooltip hooks.

Expected result: all tests pass and `git diff --check` prints no findings.

Direct verification outside the restricted launcher completed successfully:

```text
node tests/uk-retirement-simulator.test.mjs
Result: 21 tests, 21 passed, 0 failed, duration 21.6441ms.
```

## Real-browser verification

Open `uk-retirement-simulator.html` directly in a current desktop Chrome,
Edge, or Firefox. No server or network connection is required.

### Completed browser verification, 2026-08-04

Against the verified feature-branch head, including the browser fixes:

- A local HTTP page loaded successfully, and the starter Person 1 and Person 2
  fields were populated.
- Entering invalid current age `58.5` produced an accessible error and
  preserved the last valid projection. Correcting it to `58` cleared the
  errors and restored live status.
- The Nominal/Today's money toggle changed future-row values.
- Local save wrote `uk-retirement-simulator-scenario` and displayed its status.
- JSON export/download and import round-tripped the fictional scenario and
  restored it.
- Responsive checks at `390x844` and `1440x1000` showed no horizontal
  overflow.
- The chart SVG and 33-row annual table rendered together; the table caption
  stated that it contains the exact chart values. The Income view rendered
  stacked salary, State Pension and drawdown sources with essential and
  preferred target lines; the Balance view rendered stacked private-pension,
  savings and cash balances with the same age axis.
- The chart's **Your income** and **Your balance** controls switched views,
  the selected display mode updated both views, and the table exposed the
  component balances used by the Balance view.
- The right-aligned chart display control defaulted to **Today’s pounds
  (2026)** and switched to **Future pounds**; the annual table and chart
  changed together (for example, 2027 essential spending changed from
  £30,000 to £30,750).
- Adding a £15,000 savings withdrawal at age 60 rendered a dedicated lump-sum
  income segment and deducted it from savings. Hovering that segment showed
  the age, year, amount, description and source in the custom chart tooltip.
- Final browser console: 0 errors and 0 warnings. No unexpected runtime
  network requests occurred; only static page/document requests were seen.

- [x] The page loads without a console error and shows the Scenario form,
      assumptions, summary, chart and annual table.
- [x] Check the responsive layout at a narrow/mobile width and at a desktop
      width; confirm the form, summary, chart and annual table remain usable.
- [x] Enter valid fictional values for both people; input changes recalculate
      and the summary and annual table update.
### Additional scenario-specific browser cases not run in this pass

- [ ] Set one retirement age later than the other and confirm salary and
      contributions stop independently at the configured ages.
- [ ] Set different State Pension start ages and confirm each income begins in
      the expected projection year.
- [ ] Set private pensions and savings to zero, leave cash funded, and confirm
      the cash drawdown and ending balance are shown without negative values.
- [ ] Use spending values where essential is lower than preferred; confirm an
      essential-covered result can still show a preferred shortfall.
- [x] Change the display selector to **Today’s money** and confirm the table,
      chart and summary values use the selected view.
- [x] For the same displayed rows, compare the chart and annual table and
      confirm they agree on the displayed years and values.
- [x] Save locally, reload the page, and load locally; confirm the scenario is
      restored. If browser storage is unavailable, confirm the visible error is
      understandable.
- [x] Export JSON, import the exported file, and confirm the scenario remains
      valid and reproducible.
- [x] Submit invalid input and confirm field-level messages, `aria-invalid`,
      and focus behaviour are usable by keyboard.
- [x] Correct the invalid input and confirm the errors clear and the last valid
      projection returns.
- [x] Confirm the console is clean: no errors, warnings or unexpected network
      requests; the page works with JavaScript enabled from a local file.

The completed browser verification above covers the items marked `[x]`.
The remaining unchecked scenario-specific cases are follow-up coverage for
testers and contributors; they are not claimed as complete evidence here.

## Alpha 0.2.0 UI verification

The 0.2.0 release is a presentation-layer change. The engine, schema and
validation rules are untouched, so the automated suite above is unchanged and
still passes at 24 of 24.

The interface changes were driven in headless Chromium against the local file.
Forty-two checks passed with no console or page errors:

- Baseline render: four summary cards, chart bars, and 33 annual table rows.
- Summary cards carry a status class and the colour resolves; chart series
  fills resolve from custom properties rather than a literal `var()` string.
- Theme toggle flips `data-theme`, changes the resolved background, updates
  `aria-pressed`, re-renders the chart in the new palette, and survives reload.
- Validation summary appears on invalid input, names the field using its
  visible label, focuses the field when its entry is activated, and clears when
  the input is corrected. Invalid fields carry a visible ring.
- Confirmation dialog opens on New and Load locally, takes initial focus,
  closes on Escape, preserves the scenario when cancelled, restores focus to the
  invoking button, and resets the scenario when confirmed.
- Separator resizes the input panel by keyboard and the width survives reload.
- At a 390px viewport the separator is hidden and the page does not scroll
  horizontally.
- Lump sums collapse to a one-line summary that tracks amount, description and
  age as they are typed; a new row opens automatically; a collapsed row still
  feeds the projection, confirmed in both today's and future pounds; a
  collapsed row's validation error is listed in the summary and activating it
  expands the editor and focuses the field; removing a row reindexes the
  remainder so errors stay attached to the correct entry.

Evidence: `output/playwright/uk-alpha-0.2.0-dark.png`,
`uk-alpha-0.2.0-light.png`, `uk-alpha-0.2.0-mobile-390.png` and
`uk-alpha-0.2.0-lump-sums.png`.

Two defects were found and fixed during this pass, neither reachable by the
static test suite:

1. Blurring a field fires `change`, which recalculated and rebuilt the
   validation summary; that destroyed the entry the user was clicking, so
   activating it did nothing. The summary is now rebuilt only when the error set
   actually changes, and its click handling is delegated so it survives a
   rebuild.
2. Removing a lump sum detached the node without re-rendering, leaving later
   rows with their original `data-lump-index` and error ids, so their validation
   errors could attach to the wrong entry. Removal now re-renders the list and
   preserves which rows were open.

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
and today's-money conversion.

Expected result: all tests pass and `git diff --check` prints no findings.

Direct verification outside the restricted launcher completed successfully:

```text
node tests/uk-retirement-simulator.test.mjs
Result: 21 tests, 21 passed, 0 failed, duration 21.6441ms.
```

## Real-browser verification

Open `uk-retirement-simulator.html` directly in a current desktop Chrome,
Edge, or Firefox. No server or network connection is required.

### Completed browser verification — 2026-08-04

Against final implementation commit `e573ff0`, including the browser fixes:

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
  stated that it contains the exact chart values.
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

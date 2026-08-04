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

## Real-browser verification

Open `uk-retirement-simulator.html` directly in a current desktop Chrome,
Edge, or Firefox. No server or network connection is required.

- [ ] The page loads without a console error and shows the Scenario form,
      assumptions, summary, chart and annual table.
- [ ] Enter valid fictional values for both people and click **Run projection**;
      the summary and annual table update.
- [ ] Set one retirement age later than the other and confirm salary and
      contributions stop independently at the configured ages.
- [ ] Set different State Pension start ages and confirm each income begins in
      the expected projection year.
- [ ] Set private pensions and savings to zero, leave cash funded, and confirm
      the cash drawdown and ending balance are shown without negative values.
- [ ] Use spending values where essential is lower than preferred; confirm an
      essential-covered result can still show a preferred shortfall.
- [ ] Change the display selector to **Today’s money** and confirm the table,
      chart and summary values use the selected view.
- [ ] Save locally, reload the page, and load locally; confirm the scenario is
      restored. If browser storage is unavailable, confirm the visible error is
      understandable.
- [ ] Export JSON, import the exported file, and confirm the scenario remains
      valid and reproducible.
- [ ] Submit invalid input and confirm field-level messages, `aria-invalid`,
      and focus behaviour are usable by keyboard.
- [ ] Confirm the page makes no network requests and works with JavaScript
      enabled from a local file.

Real-browser execution is a handoff item when a browser session is not
available to the verification agent.

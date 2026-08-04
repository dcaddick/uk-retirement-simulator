# UK Retirement Simulator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a transparent browser-based deterministic simulator for an approaching-retirement UK couple using State Pension, simple private-pension pots, savings and cash.

**Architecture:** Keep the first release as a single local HTML application, following the current simulator's local-first distribution pattern. Put the calculation engine in a marked script section that the Node regression harness extracts, so the engine remains testable without adding a build system. Keep the scenario schema small and explicit; UK tax, benefits, annuities, defined-benefit pensions, mortality and Monte Carlo remain outside this plan.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node.js ESM regression tests, browser-native local storage and JSON import/export.

---

## File map

- Create: `uk-retirement-simulator.html` — self-contained interface, scenario editor, engine script, results table and chart.
- Create: `tests/uk-retirement-simulator.test.mjs` — extracts the engine from the HTML and tests schema, projection math and invariants.
- Create: `docs/MODEL-METHODOLOGY.md` — annual calculation order, assumptions and exclusions.
- Create: `docs/TESTING.md` — automated and browser verification checklist.
- Modify: `README.md` — user-facing scope, run instructions and disclaimer.
- Modify: `CHANGELOG.md` — initial MVP entry after the first working release.

## Task 1: Establish the scenario contract

**Files:**
- Create: `tests/uk-retirement-simulator.test.mjs`
- Modify: `uk-retirement-simulator.html`

- [ ] **Step 1: Write failing schema tests** for a two-person scenario containing `schemaVersion`, `startYear`, `household`, `people`, `cash`, `savings` and `drawdownPriority`.

```js
const sample = core.sampleScenario();
check('sample has two people', sample.people.length === 2);
check('sample has UK currency', sample.currency === 'GBP');
check('sample has explicit spending targets',
  sample.household.essentialAnnual > 0 &&
  sample.household.preferredAnnual >= sample.household.essentialAnnual);
```

- [ ] **Step 2: Run the focused test** with `node tests/uk-retirement-simulator.test.mjs` and confirm it fails because the engine is not present.

- [ ] **Step 3: Implement the minimal scenario helpers** inside the engine script: `SCHEMA_VERSION`, `sampleScenario()`, `validateScenario(scenario)` and `migrateScenario(raw)`.

The schema must use one private pension pot per person:

```js
{
  schemaVersion: 1,
  currency: 'GBP',
  startYear: 2026,
  household: {
    essentialAnnual: 30000,
    preferredAnnual: 36000,
    inflationPct: 2.5,
    endAge: 90,
    drawdownPriority: ['privatePension', 'savings', 'cash']
  },
  people: [{
    name: 'Person 1', age: 58, retirementAge: 60,
    salary: 45000, annualPensionContribution: 9000,
    privatePension: { pot: 180000, growthPct: 4.5 },
    statePension: { startAge: 67, annualAmount: 12500 }
  }, {
    name: 'Person 2', age: 56, retirementAge: 60,
    salary: 30000, annualPensionContribution: 6000,
    privatePension: { pot: 120000, growthPct: 4.5 },
    statePension: { startAge: 67, annualAmount: 12500 }
  }],
  cash: { amount: 15000, interestPct: 0 },
  savings: { amount: 50000, interestPct: 3 }
}
```

- [ ] **Step 4: Run the focused tests** and verify valid samples pass while negative ages, negative balances, invalid priorities and preferred spending below essential spending are rejected with field-specific errors.

- [ ] **Step 5: Commit** with `git add uk-retirement-simulator.html tests/uk-retirement-simulator.test.mjs; git commit -m "feat: define UK MVP scenario contract"`.

## Task 2: Implement the deterministic annual engine

**Files:**
- Modify: `uk-retirement-simulator.html`
- Modify: `tests/uk-retirement-simulator.test.mjs`

- [ ] **Step 1: Add failing calculation tests** covering retirement cutoff, contributions, private-pension growth, State Pension start age, spending funding and balance depletion.

```js
const scenario = core.sampleScenario();
scenario.people[0].age = 60;
scenario.people[0].retirementAge = 60;
scenario.people[1].age = 60;
scenario.people[1].retirementAge = 60;
scenario.household.essentialAnnual = 0;
scenario.household.preferredAnnual = 0;
const rows = core.projectScenario(scenario);
check('retired person stops contributions', rows[0].contributions[0] === 0);
check('State Pension starts at configured age',
  rows.find(row => row.ages[0] === 67).statePension[0] > 0);
```

- [ ] **Step 2: Run the focused test** and confirm the projection function is missing.

- [ ] **Step 3: Implement `projectScenario(scenario)`** using this fixed order:

```text
for each year:
  calculate person ages
  add salary and contributions for people below retirement age
  grow each private pension, savings and cash
  add State Pension after each person's start age
  fund preferred spending using the configured priority
  calculate essential-spending coverage and shortfall
  store income, draws, balances and depletion flags
```

Use annual timing consistently. Apply growth before that year's draw, and never allow a balance or draw to become negative. State Pension is income and is never depleted. Private pension, savings and cash are drawdown sources.

- [ ] **Step 4: Add today's-money conversion** using the cumulative inflation factor and retain nominal values in every row for auditability.

- [ ] **Step 5: Add invariant tests** for conservation of balances, no negative assets, no State Pension before its start age, contributions stopping at retirement and drawdown respecting priority order.

- [ ] **Step 6: Run the full Node suite** with `node tests/uk-retirement-simulator.test.mjs` and confirm all engine tests pass.

- [ ] **Step 7: Commit** with `git add uk-retirement-simulator.html tests/uk-retirement-simulator.test.mjs; git commit -m "feat: add deterministic UK retirement projection"`.

## Task 3: Build the minimal scenario interface

**Files:**
- Modify: `uk-retirement-simulator.html`

- [ ] **Step 1: Add the form sections** in this order: Scenario, Person 1, Person 2, Cash and savings, Drawdown order, Assumptions.

- [ ] **Step 2: Bind every input to the scenario contract** and recalculate after valid edits. Display field-level validation errors without erasing the last valid projection.

- [ ] **Step 3: Add the result summary** showing essential-spending status, first depletion age, preferred-spending shortfall and ending balances.

- [ ] **Step 4: Add one annual chart** with State Pension income, private-pension drawdown, savings/cash drawdown and essential spending. Keep the chart inspectable through the table; do not add Monte Carlo or interactive sensitivity controls.

- [ ] **Step 5: Add nominal/today's-money toggle** and ensure the table, summary and chart use the selected display mode consistently.

- [ ] **Step 6: Add local persistence and JSON transfer** with explicit user actions for save, new scenario, export and import. Do not make network requests.

- [ ] **Step 7: Run the Node suite** and inspect the HTML for syntax errors before browser testing.

- [ ] **Step 8: Commit** with `git add uk-retirement-simulator.html; git commit -m "feat: add focused UK MVP interface"`.

## Task 4: Add methodology and starter scenario documentation

**Files:**
- Create: `docs/MODEL-METHODOLOGY.md`
- Modify: `README.md`
- Modify: `uk-retirement-simulator.html`

- [ ] **Step 1: Document the annual calculation sequence** and define salary, contribution, growth, pension income, drawdown and inflation assumptions in plain language.

- [ ] **Step 2: Document every deliberate exclusion**: tax, National Insurance, Pension Credit, annuities, defined-benefit pensions, multiple pots, property, investments, stochastic returns, mortality and advice.

- [ ] **Step 3: Label the sample as fictional and illustrative**, not “typical”. Keep its assumptions editable and show the current assumption set inside the application.

- [ ] **Step 4: Update README run instructions** for opening the single HTML file, importing/exporting scenarios and understanding the estimate-only boundary.

- [ ] **Step 5: Commit** with `git add README.md docs/MODEL-METHODOLOGY.md uk-retirement-simulator.html; git commit -m "docs: explain UK MVP assumptions and limits"`.

## Task 5: Verify the MVP in Node and a real browser

**Files:**
- Create: `docs/TESTING.md`
- Modify: `tests/uk-retirement-simulator.test.mjs`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add regression fixtures** for: both people retired, staggered retirement, staggered State Pension starts, zero private pension, savings exhaustion, cash-only funding, preferred-versus-essential shortfall and today's-money conversion.

- [ ] **Step 2: Run `node tests/uk-retirement-simulator.test.mjs`** and record the passing result in the testing notes.

- [ ] **Step 3: Perform browser verification** covering initial load, editing each input, invalid input recovery, chart/table agreement, nominal/today's-money switching, local persistence, JSON round trip, responsive layout and zero console errors.

- [ ] **Step 4: Confirm the MVP has no network requests** and that the fictional sample contains no personal data.

- [ ] **Step 5: Add an initial changelog entry** describing the deterministic UK MVP and its exclusions.

- [ ] **Step 6: Run `git diff --check` and `git status --short --branch`**, then commit with `git add docs/TESTING.md CHANGELOG.md tests/uk-retirement-simulator.test.mjs; git commit -m "test: verify UK retirement MVP baseline"`.

## Scope guard

Do not begin a follow-on plan until the deterministic MVP passes its engine and browser checks. UK tax, benefits, annuities, detailed pension legislation, survivor modelling and Monte Carlo each require separate designs, authoritative sources and explicit approval.

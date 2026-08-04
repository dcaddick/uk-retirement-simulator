import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'uk-retirement-simulator.html'), 'utf8');
test('UK MVP markup exposes the focused interface without network dependencies', () => {
  const sections = ['Scenario', 'Person 1', 'Person 2', 'Cash and savings', 'Drawdown order', 'Assumptions'];
  let previous = -1;
  for (const section of sections) {
    const position = html.indexOf(`<h2>${section}</h2>`);
    assert.ok(position > previous, `section ${section} is missing or out of order`);
    previous = position;
  }
  for (const hook of ['scenario-form', 'summary', 'annual-chart', 'results-table', 'display-mode', 'save-scenario', 'load-scenario', 'export-scenario', 'import-scenario']) {
    assert.match(html, new RegExp(`(?:id|data-field)=["']${hook}`), `missing interface hook ${hook}`);
  }
  assert.match(html, /setupValidationAccessibility/);
  assert.match(html, /setAttribute\('aria-invalid', 'false'\)/);
  assert.match(html, /setAttribute\('aria-invalid', 'true'\)/);
  assert.match(html, /setAttribute\('aria-describedby'/);
  assert.match(html, /Could not save locally:/);
  assert.doesNotMatch(html, /\b(fetch|XMLHttpRequest|WebSocket)\b|https?:\/\//, 'the MVP must not make network requests');
});

test('UI script remains parseable outside the engine harness', () => {
  const uiMatch = html.match(/<script>\s*\(\(\) => \{\s*const form = document\.querySelector\('#scenario-form'\)[\s\S]*?<\/script>/);
  assert.ok(uiMatch, 'UI script must be present');
  assert.doesNotThrow(() => new vm.Script(uiMatch[0].replace(/^<script>|<\/script>$/g, '')));
});

const match = html.match(/\/\* ENGINE_START \*\/([\s\S]*?)\/\* ENGINE_END \*\//);
assert.ok(match, 'HTML must contain marked engine code');

const context = { console };
vm.runInNewContext(`globalThis.window = globalThis;${match[1]}`, context);
const { SCHEMA_VERSION, sampleScenario, validateScenario, migrateScenario, projectScenario } = context;

test('sample scenario is a valid two-person GBP scenario', () => {
  assert.equal(SCHEMA_VERSION, 1);
  const scenario = sampleScenario();
  assert.deepEqual(scenario, {
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
    people: [
      {
        name: 'Person 1', age: 58, retirementAge: 60,
        salary: 45000, annualPensionContribution: 9000,
        privatePension: { pot: 180000, growthPct: 4.5 },
        statePension: { startAge: 67, annualAmount: 12500 }
      },
      {
        name: 'Person 2', age: 56, retirementAge: 60,
        salary: 30000, annualPensionContribution: 6000,
        privatePension: { pot: 120000, growthPct: 4.5 },
        statePension: { startAge: 67, annualAmount: 12500 }
      }
    ],
    cash: { amount: 15000, interestPct: 0 },
    savings: { amount: 50000, interestPct: 3 }
  });
  assert.deepEqual(validateScenario(scenario), { valid: true, errors: [] });
});

test('validation requires exactly two people for the fixed MVP interface', () => {
  for (const count of [0, 1, 3]) {
    const scenario = sampleScenario();
    scenario.people = scenario.people.slice(0, count);
    if (count === 3) scenario.people.push({ ...sampleScenario().people[0], name: 'Person 3' });
    const result = validateScenario(scenario);
    assert.ok(result.errors.some((error) => error.field === 'people' && error.message === 'must contain exactly two people'), `missing exact-size error for ${count} people`);
  }
});

test('validation reports field-specific errors for invalid values', () => {
  const scenario = sampleScenario();
  scenario.people[0].age = -1;
  scenario.cash.amount = -10;
  scenario.savings.amount = -1;
  scenario.household.drawdownPriority = ['cash', 'cash', 'unknown'];
  scenario.household.preferredAnnual = 29999;

  const result = validateScenario(scenario);
  assert.equal(result.valid, false);
  for (const field of [
    'people[0].age',
    'cash.amount',
    'savings.amount',
    'household.drawdownPriority',
    'household.preferredAnnual'
  ]) {
    assert.ok(result.errors.some((error) => error.field === field), `missing error for ${field}`);
  }
});

test('validation rejects fractional ages and cutoffs with field-specific errors', () => {
  const scenario = sampleScenario();
  scenario.household.endAge = 90.5;
  scenario.people[0].age = 58.5;
  scenario.people[0].retirementAge = 60.5;
  scenario.people[0].statePension.startAge = 67.5;

  const result = validateScenario(scenario);
  assert.equal(result.valid, false);
  for (const field of [
    'household.endAge',
    'people[0].age',
    'people[0].retirementAge',
    'people[0].statePension.startAge'
  ]) {
    assert.ok(result.errors.some((error) => error.field === field && error.message === 'must be an integer'), `missing integer error for ${field}`);
  }
});

test('validation rejects an end age below the oldest current person age', () => {
  const scenario = sampleScenario();
  scenario.household.endAge = 57;

  const result = validateScenario(scenario);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field === 'household.endAge' && error.message === 'must be at least the oldest current person age'));
});

test('validation reports malformed person entries without throwing', () => {
  const scenario = sampleScenario();
  scenario.people = [null, 'not a person'];

  const result = validateScenario(scenario);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field === 'people[0]'));
  assert.ok(result.errors.some((error) => error.field === 'people[1]'));
});

test('migration creates a current-version scenario without mutating raw input', () => {
  const raw = { ...sampleScenario() };
  delete raw.schemaVersion;
  delete raw.currency;
  const migrated = migrateScenario(raw);
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.currency, 'GBP');
  assert.deepEqual(raw.schemaVersion, undefined);
  assert.deepEqual(validateScenario(migrated), { valid: true, errors: [] });
});

test('projects ages, salary, contributions and State Pension from their configured cutoffs', () => {
  const scenario = sampleScenario();
  scenario.startYear = 2026;
  scenario.household.endAge = 68;
  scenario.people[0].age = 59;
  scenario.people[0].retirementAge = 60;
  scenario.people[0].statePension.startAge = 61;
  scenario.people[1].age = 60;
  scenario.people[1].retirementAge = 60;
  scenario.people[1].statePension.startAge = 62;
  scenario.household.essentialAnnual = 0;
  scenario.household.preferredAnnual = 0;

  const rows = projectScenario(scenario);

  assert.equal(rows[0].year, 2026);
  assert.deepEqual(rows[0].ages, [59, 60]);
  assert.deepEqual(rows[0].salary, [45000, 0]);
  assert.deepEqual(rows[0].contributions, [9000, 0]);
  assert.deepEqual(rows[1].ages, [60, 61]);
  assert.deepEqual(rows[1].salary, [0, 0]);
  assert.deepEqual(rows[1].contributions, [0, 0]);
  assert.deepEqual(rows[0].statePension, [0, 0]);
  assert.deepEqual(rows[1].statePension, [0, 0]);
  assert.deepEqual(rows[2].statePension, [12500, 12500]);
});

test('grows assets before the annual draw and respects configured drawdown priority', () => {
  const scenario = sampleScenario();
  scenario.startYear = 2026;
  scenario.household.endAge = 60;
  scenario.household.essentialAnnual = 0;
  scenario.household.preferredAnnual = 100;
  scenario.household.inflationPct = 0;
  scenario.household.drawdownPriority = ['savings', 'cash', 'privatePension'];
  scenario.people = [{
    name: 'Test', age: 60, retirementAge: 60, salary: 0, annualPensionContribution: 0,
    privatePension: { pot: 1000, growthPct: 10 },
    statePension: { startAge: 70, annualAmount: 0 }
  }, {
    name: 'Second test person', age: 60, retirementAge: 60, salary: 0, annualPensionContribution: 0,
    privatePension: { pot: 0, growthPct: 0 },
    statePension: { startAge: 70, annualAmount: 0 }
  }];
  scenario.savings = { amount: 50, interestPct: 10 };
  scenario.cash = { amount: 25, interestPct: 0 };

  const [row] = projectScenario(scenario);

  assert.equal(row.growth.privatePension[0], 100);
  assert.equal(row.growth.savings, 5);
  assert.equal(row.draws.savings, 55);
  assert.equal(row.draws.cash, 25);
  assert.equal(row.draws.privatePension[0], 20);
  assert.equal(row.balances.savings, 0);
  assert.equal(row.balances.cash, 0);
  assert.equal(row.balances.privatePension[0], 1080);
});

test('reports depletion, essential shortfall, nominal audit values and today money values', () => {
  const scenario = sampleScenario();
  scenario.startYear = 2026;
  scenario.household.endAge = 61;
  scenario.household.essentialAnnual = 120;
  scenario.household.preferredAnnual = 120;
  scenario.household.inflationPct = 10;
  scenario.people = [{
    name: 'Test', age: 60, retirementAge: 60, salary: 0, annualPensionContribution: 0,
    privatePension: { pot: 0, growthPct: 0 },
    statePension: { startAge: 70, annualAmount: 0 }
  }, {
    name: 'Second test person', age: 60, retirementAge: 60, salary: 0, annualPensionContribution: 0,
    privatePension: { pot: 0, growthPct: 0 },
    statePension: { startAge: 70, annualAmount: 0 }
  }];
  scenario.savings = { amount: 50, interestPct: 0 };
  scenario.cash = { amount: 25, interestPct: 0 };

  const rows = projectScenario(scenario);

  assert.equal(rows[0].draws.savings, 50);
  assert.equal(rows[0].draws.cash, 25);
  assert.equal(rows[0].spending.preferredShortfall, 45);
  assert.equal(rows[0].spending.essentialShortfall, 45);
  assert.equal(rows[0].spending.essentialCovered, false);
  assert.deepEqual(rows[0].depletion, { privatePension: [true, true], savings: true, cash: true });
  assert.equal(rows[0].nominal.spending.preferred, 120);
  assert.ok(Math.abs(rows[0].todaysMoney.spending.preferred - 120) < 1e-9);
  assert.equal(rows[1].nominal.spending.preferred, 132);
  assert.ok(Math.abs(rows[1].todaysMoney.spending.preferred - 120) < 1e-9);
  assert.equal(rows[0].nominal.balances.savings, 0);
});

test('preserves balance conservation and never creates negative assets or draws', () => {
  const scenario = sampleScenario();
  scenario.startYear = 2026;
  scenario.household.endAge = 63;
  scenario.household.essentialAnnual = 0;
  scenario.household.preferredAnnual = 50000;

  const rows = projectScenario(scenario);
  const initialPrivate = scenario.people.map((person) => person.privatePension.pot);
  let previous = {
    privatePension: initialPrivate,
    savings: scenario.savings.amount,
    cash: scenario.cash.amount
  };

  for (const row of rows) {
    row.balances.privatePension.forEach((balance) => assert.ok(balance >= 0));
    assert.ok(row.balances.savings >= 0);
    assert.ok(row.balances.cash >= 0);
    row.draws.privatePension.forEach((draw) => assert.ok(draw >= 0));
    assert.ok(row.draws.savings >= 0);
    assert.ok(row.draws.cash >= 0);

    row.balances.privatePension.forEach((balance, index) => {
      assert.ok(Math.abs(balance - (previous.privatePension[index] + row.contributions[index] + row.growth.privatePension[index] - row.draws.privatePension[index])) < 1e-9);
    });
    assert.ok(Math.abs(row.balances.savings - (previous.savings + row.growth.savings - row.draws.savings)) < 1e-9);
    assert.ok(Math.abs(row.balances.cash - (previous.cash + row.growth.cash - row.draws.cash)) < 1e-9);
    previous = {
      privatePension: row.balances.privatePension,
      savings: row.balances.savings,
      cash: row.balances.cash
    };
  }
});

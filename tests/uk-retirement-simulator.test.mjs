import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'uk-retirement-simulator.html'), 'utf8');
test('UK MVP markup exposes the focused interface without network dependencies', () => {
  const sections = ['Scenario', 'People', 'Returns and inflation', 'Cash and savings', 'Drawdown order', 'Lump sum withdrawals', 'Other income', 'Household'];
  let previous = -1;
  for (const section of sections) {
    const position = html.indexOf(`<h2>${section}</h2>`);
    assert.ok(position > previous, `section ${section} is missing or out of order`);
    previous = position;
  }
  for (const hook of ['scenario-form', 'summary', 'annual-chart', 'chart-tooltip', 'results-table', 'display-mode', 'chart-income', 'chart-balance', 'chart-legend', 'lump-sum-list', 'add-lump-sum', 'other-income-list', 'add-other-income', 'save-scenario', 'load-scenario', 'export-scenario', 'import-scenario']) {
    assert.match(html, new RegExp(`(?:id|data-field)=["']${hook}`), `missing interface hook ${hook}`);
  }
  assert.match(html, /setupValidationAccessibility/);
  assert.match(html, /setAttribute\('aria-invalid', 'false'\)/);
  assert.match(html, /setAttribute\('aria-invalid', 'true'\)/);
  assert.match(html, /setAttribute\('aria-describedby'/);
  assert.match(html, /Could not save locally:/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /Stacked bars show the remaining private-pension, savings and cash balances/);
  assert.match(html, /const setChartMode = \(mode\)/);
  assert.ok(html.indexOf('id="annual-chart"') < html.indexOf('id="display-mode"'), 'display selector must sit beneath the chart');
  assert.match(html, /Today’s pounds \(2026\)/);
  assert.match(html, /Future pounds/);
  assert.match(html, /data-chart-tooltip/);
  assert.match(html, /showTooltip/);
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,/i, 'the app must provide a local inline favicon');
  assert.doesNotMatch(html, /\b(fetch|XMLHttpRequest|WebSocket)\b|https?:\/\//, 'the MVP must not make network requests');
});

test('UI script remains parseable outside the engine harness', () => {
  const uiMatch = html.match(/<script>\s*\(\(\) => \{\s*const form = document\.querySelector\('#scenario-form'\)[\s\S]*?<\/script>/);
  assert.ok(uiMatch, 'UI script must be present');
  assert.match(uiMatch[0], /const clone = \(value\) => JSON\.parse\(JSON\.stringify\(value\)\);/, 'UI script must define its own clone helper');
  assert.match(uiMatch[0], /const sum = \(values\) => values\.reduce\(\(total, value\) => total \+ value, 0\);/, 'UI script must define its own sum helper');
  assert.ok(uiMatch[0].includes("const getPath = (object, path) => path.replace(/\\[(\\d+)\\]/g, '.$1').split('.')"), 'UI form binding must resolve bracketed person paths');
  assert.match(uiMatch[0], /setupValidationAccessibility\(\); fillForm\(sample\); showErrors\(\[\]\); renderResults\(\);/, 'sample scenario must populate the form on initial load');
  assert.doesNotThrow(() => new vm.Script(uiMatch[0].replace(/^<script>|<\/script>$/g, '')));
});

const match = html.match(/\/\* ENGINE_START \*\/([\s\S]*?)\/\* ENGINE_END \*\//);
assert.ok(match, 'HTML must contain marked engine code');

const context = { console };
vm.runInNewContext(`globalThis.window = globalThis;${match[1]}`, context);
const { SCHEMA_VERSION, sampleScenario, validateScenario, migrateScenario, projectScenario } = context;

const fixture = (update) => {
  const scenario = structuredClone(sampleScenario());
  update(scenario);
  return scenario;
};

test('sample scenario is a valid two-person GBP scenario', () => {
  assert.equal(SCHEMA_VERSION, 3);
  const scenario = sampleScenario();
  assert.deepEqual(scenario, {
    schemaVersion: 3,
    currency: 'GBP',
    scenarioName: 'Sample household',
    startYear: 2026,
    household: {
      essentialAnnual: 30000,
      preferredAnnual: 36000,
      inflationPct: 2.0,
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
    savings: { amount: 50000, interestPct: 3 },
    lumpSumWithdrawals: [],
    otherIncome: []
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
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.currency, 'GBP');
  assert.deepEqual(raw.schemaVersion, undefined);
  assert.deepEqual(validateScenario(migrated), { valid: true, errors: [] });
});

test('migration re-stamps an older explicit schemaVersion to the current one', () => {
  const raw = { ...sampleScenario(), schemaVersion: 1 };
  const migrated = migrateScenario(raw);
  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(validateScenario(migrated), { valid: true, errors: [] });
});

test('migration defaults a missing scenario name to an empty string, and validation requires text', () => {
  const raw = sampleScenario();
  delete raw.scenarioName;
  const migrated = migrateScenario(raw);
  assert.equal(migrated.scenarioName, '');
  assert.deepEqual(validateScenario(migrated), { valid: true, errors: [] });

  const invalid = sampleScenario();
  invalid.scenarioName = 42;
  const result = validateScenario(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field === 'scenarioName'));
});

test('a lump sum missing the enabled flag migrates to enabled, and a disabled lump sum is excluded from the projection', () => {
  const raw = sampleScenario();
  raw.lumpSumWithdrawals = [{ age: 60, amount: 5000, source: 'cash', label: 'Legacy entry' }];
  const migrated = migrateScenario(raw);
  assert.equal(migrated.lumpSumWithdrawals[0].enabled, true);

  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 60;
    value.household.essentialAnnual = 0;
    value.household.preferredAnnual = 0;
    value.people.forEach((person) => {
      person.age = 60;
      person.retirementAge = 60;
      person.salary = 0;
      person.annualPensionContribution = 0;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 70, annualAmount: 0 };
    });
    value.cash = { amount: 10000, interestPct: 0 };
    value.lumpSumWithdrawals = [{ age: 60, amount: 5000, source: 'cash', label: 'Disabled entry', enabled: false }];
  });
  const [row] = projectScenario(scenario);
  assert.equal(row.income.lumpSum, 0);
  assert.equal(row.balances.cash, 10000);
  assert.deepEqual(row.lumpSumWithdrawals, []);
});

test('validates other-income fields and keeps older scenarios migratable', () => {
  const scenario = sampleScenario();
  delete scenario.otherIncome;
  const migrated = migrateScenario(scenario);
  assert.deepEqual(migrated.otherIncome, []);
  migrated.otherIncome = [{ label: '', annualAmount: -1, startAge: -1 }];
  const result = validateScenario(migrated);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field === 'otherIncome[0].label'));
  assert.ok(result.errors.some((error) => error.field === 'otherIncome[0].annualAmount'));
  assert.ok(result.errors.some((error) => error.field === 'otherIncome[0].startAge'));
});

test('an other-income entry missing the enabled flag migrates to enabled', () => {
  const raw = sampleScenario();
  raw.otherIncome = [{ label: 'Legacy entry', annualAmount: 4000, startAge: 65 }];
  const migrated = migrateScenario(raw);
  assert.equal(migrated.otherIncome[0].enabled, true);
});

test('other income starts at the configured age, inflates like State Pension, funds spending, and a disabled entry is excluded', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 68;
    value.household.inflationPct = 10;
    value.household.essentialAnnual = 0;
    value.household.preferredAnnual = 0;
    value.people.forEach((person) => {
      person.age = 66;
      person.retirementAge = 70;
      person.salary = 0;
      person.annualPensionContribution = 0;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 70, annualAmount: 0 };
    });
    value.savings = { amount: 0, interestPct: 0 };
    value.cash = { amount: 0, interestPct: 0 };
    value.otherIncome = [
      { label: 'Defined benefit pension', annualAmount: 100, startAge: 67, enabled: true },
      { label: 'Ignored rental income', annualAmount: 9000, startAge: 67, enabled: false }
    ];
  });

  const rows = projectScenario(scenario);

  // yearIndex 0: age 66, neither entry has started yet.
  assert.equal(rows[0].income.other, 0);
  assert.deepEqual(rows[0].otherIncome, []);
  // yearIndex 1: age 67, the enabled entry starts; the disabled one never appears.
  assert.ok(Math.abs(rows[1].income.other - 110) < 1e-9); // 100 * 1.10^1
  assert.equal(rows[1].otherIncome.length, 1);
  assert.equal(rows[1].otherIncome[0].label, 'Defined benefit pension');
  // yearIndex 2: continues compounding from the projection start year, not from age 67.
  assert.ok(Math.abs(rows[2].income.other - 121) < 1e-9); // 100 * 1.10^2

  // Salary and State Pension are both 0 here, so income.total isolates other income,
  // proving it is summed into the same funding total the way State Pension already is.
  assert.equal(rows[1].income.total, rows[1].income.other);
});

test('projects ages, salary, contributions and State Pension from their configured cutoffs', () => {
  const scenario = sampleScenario();
  scenario.startYear = 2026;
  scenario.household.endAge = 68;
  scenario.household.inflationPct = 0;
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

test('projects both people as retired when each is at or beyond retirement age', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 66;
    value.people[0].age = 65;
    value.people[0].retirementAge = 60;
    value.people[1].age = 64;
    value.people[1].retirementAge = 62;
  });

  const [row] = projectScenario(scenario);

  assert.deepEqual(row.salary, [0, 0]);
  assert.deepEqual(row.contributions, [0, 0]);
});

test('stops salary and contributions at different retirement ages', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 64;
    value.people[0].age = 59;
    value.people[0].retirementAge = 60;
    value.people[1].age = 58;
    value.people[1].retirementAge = 62;
    value.household.essentialAnnual = 0;
    value.household.preferredAnnual = 0;
  });

  const rows = projectScenario(scenario);

  assert.deepEqual(rows[0].salary, [45000, 30000]);
  assert.deepEqual(rows[1].salary, [0, 30000]);
  assert.deepEqual(rows[2].salary, [0, 30000]);
  assert.deepEqual(rows[0].contributions, [9000, 6000]);
  assert.deepEqual(rows[1].contributions, [0, 6000]);
  assert.deepEqual(rows[2].contributions, [0, 6000]);
  assert.deepEqual(rows[3].contributions, [0, 6000]);
  assert.deepEqual(rows[4].contributions, [0, 0]);
});

test('starts State Pension independently for each person', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 69;
    value.household.inflationPct = 0;
    value.people[0].age = 66;
    value.people[0].retirementAge = 60;
    value.people[0].statePension = { startAge: 67, annualAmount: 8400 };
    value.people[1].age = 65;
    value.people[1].retirementAge = 60;
    value.people[1].statePension = { startAge: 68, annualAmount: 9600 };
    value.household.essentialAnnual = 0;
    value.household.preferredAnnual = 0;
  });

  const rows = projectScenario(scenario);

  assert.deepEqual(rows[0].statePension, [0, 0]);
  assert.deepEqual(rows[1].statePension, [8400, 0]);
  assert.deepEqual(rows[2].statePension, [8400, 0]);
  assert.deepEqual(rows[3].statePension, [8400, 9600]);
});

test('uprates State Pension with inflation from the projection start year, while salary stays flat', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 69;
    value.household.inflationPct = 10;
    value.household.essentialAnnual = 0;
    value.household.preferredAnnual = 0;
    value.people[0].age = 66;
    value.people[0].retirementAge = 70;
    value.people[0].salary = 1000;
    value.people[0].annualPensionContribution = 0;
    value.people[0].privatePension = { pot: 0, growthPct: 0 };
    value.people[0].statePension = { startAge: 67, annualAmount: 100 };
    value.people[1].age = 66;
    value.people[1].retirementAge = 70;
    value.people[1].salary = 0;
    value.people[1].annualPensionContribution = 0;
    value.people[1].privatePension = { pot: 0, growthPct: 0 };
    value.people[1].statePension = { startAge: 67, annualAmount: 100 };
  });

  const rows = projectScenario(scenario);

  // Salary is entered flat and never inflates, regardless of the configured rate.
  assert.deepEqual(rows[0].salary, [1000, 0]);
  assert.deepEqual(rows[1].salary, [1000, 0]);
  assert.deepEqual(rows[3].salary, [1000, 0]);

  // State Pension is entered in today's money and inflates like a spending
  // target, compounding from the projection start year (yearIndex 0), not
  // from the year each person starts claiming it.
  assert.deepEqual(rows[0].statePension, [0, 0]);
  assert.ok(Math.abs(rows[1].statePension[0] - 110) < 1e-9); // 100 * 1.10^1
  assert.ok(Math.abs(rows[1].statePension[1] - 110) < 1e-9);
  assert.ok(Math.abs(rows[3].statePension[0] - 133.1) < 1e-9); // 100 * 1.10^3
});

test('validates lump-sum withdrawal fields and keeps older scenarios migratable', () => {
  const scenario = sampleScenario();
  delete scenario.lumpSumWithdrawals;
  const migrated = migrateScenario(scenario);
  assert.deepEqual(migrated.lumpSumWithdrawals, []);
  migrated.lumpSumWithdrawals = [{ age: 57, amount: -1, source: 'unknown', label: 4 }];
  const result = validateScenario(migrated);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field === 'lumpSumWithdrawals[0].age'));
  assert.ok(result.errors.some((error) => error.field === 'lumpSumWithdrawals[0].amount'));
  assert.ok(result.errors.some((error) => error.field === 'lumpSumWithdrawals[0].source'));
  assert.ok(result.errors.some((error) => error.field === 'lumpSumWithdrawals[0].label'));
});

test('applies a lump-sum withdrawal as one-off spending, deducted from its source without funding regular drawdown', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 60;
    value.household.essentialAnnual = 10000;
    value.household.preferredAnnual = 10000;
    value.people.forEach((person) => {
      person.age = 60;
      person.retirementAge = 60;
      person.salary = 0;
      person.annualPensionContribution = 0;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 70, annualAmount: 0 };
    });
    value.savings = { amount: 10000, interestPct: 0 };
    value.cash = { amount: 0, interestPct: 0 };
    value.lumpSumWithdrawals = [{ age: 60, amount: 15000, source: 'savings', label: 'Home project' }];
  });

  const [row] = projectScenario(scenario);

  // The lump sum still reports as drawn and reduces its source, but must not
  // displace the ordinary drawdown that funds this year's spending target:
  // with savings emptied by the lump sum and no other resources, the full
  // preferred spend goes unfunded rather than reading as covered.
  assert.equal(row.income.lumpSum, 10000);
  assert.equal(row.income.total, 0);
  assert.equal(row.draws.total, 0);
  assert.equal(row.balances.savings, 0);
  assert.deepEqual(row.lumpSumWithdrawals, [{ age: 60, amount: 15000, source: 'savings', label: 'Home project', drawn: 10000, shortfall: 5000 }]);
  assert.equal(row.spending.preferredShortfall, 10000);
});

test('a lump-sum withdrawal does not displace the ordinary drawdown that funds spending', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 60;
    value.household.essentialAnnual = 5000;
    value.household.preferredAnnual = 5000;
    value.people.forEach((person) => {
      person.age = 60;
      person.retirementAge = 60;
      person.salary = 0;
      person.annualPensionContribution = 0;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 70, annualAmount: 0 };
    });
    value.savings = { amount: 20000, interestPct: 0 };
    value.cash = { amount: 10000, interestPct: 0 };
    value.lumpSumWithdrawals = [{ age: 60, amount: 8000, source: 'cash', label: 'Kitchen refit' }];
  });

  const [row] = projectScenario(scenario);

  // Regression for #17: previously the lump sum counted as income, so it
  // fully covered the spending target and ordinary drawdown never ran.
  assert.equal(row.income.lumpSum, 8000);
  assert.equal(row.income.total, 0);
  assert.equal(row.draws.savings, 5000);
  assert.equal(row.draws.total, 5000);
  assert.equal(row.balances.savings, 15000);
  assert.equal(row.balances.cash, 2000);
  assert.equal(row.spending.preferredShortfall, 0);
});

test('funds spending without private pensions when their pots are zero', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 60;
    value.household.essentialAnnual = 600;
    value.household.preferredAnnual = 900;
    value.people.forEach((person) => {
      person.age = 60;
      person.retirementAge = 60;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 70, annualAmount: 0 };
    });
    value.savings = { amount: 1200, interestPct: 0 };
    value.cash = { amount: 0, interestPct: 0 };
    value.household.drawdownPriority = ['privatePension', 'savings', 'cash'];
  });

  const [row] = projectScenario(scenario);

  assert.deepEqual(row.draws.privatePension, [0, 0]);
  assert.equal(row.draws.savings, 900);
  assert.equal(row.spending.preferredShortfall, 0);
});

test('counts State Pension cumulatively before private pension top-up', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 67;
    value.household.essentialAnnual = 30000;
    value.household.preferredAnnual = 36000;
    value.people.forEach((person) => {
      person.age = 67;
      person.retirementAge = 60;
      person.privatePension = { pot: 100000, growthPct: 0 };
      person.statePension = { startAge: 67, annualAmount: 12500 };
    });
    value.savings = { amount: 0, interestPct: 0 };
    value.cash = { amount: 0, interestPct: 0 };
    value.household.drawdownPriority = ['privatePension', 'savings', 'cash'];
  });

  const [row] = projectScenario(scenario);

  assert.equal(row.income.statePension, 25000);
  assert.equal(row.draws.total, 11000);
  assert.equal(row.income.total + row.draws.total, 36000);
  assert.equal(row.spending.preferredShortfall, 0);
});

test('records savings exhaustion before using cash', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 60;
    value.household.essentialAnnual = 600;
    value.household.preferredAnnual = 600;
    value.people.forEach((person) => {
      person.age = 60;
      person.retirementAge = 60;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 70, annualAmount: 0 };
    });
    value.savings = { amount: 300, interestPct: 0 };
    value.cash = { amount: 500, interestPct: 0 };
    value.household.drawdownPriority = ['savings', 'cash', 'privatePension'];
  });

  const [row] = projectScenario(scenario);

  assert.equal(row.draws.savings, 300);
  assert.equal(row.balances.savings, 0);
  assert.equal(row.draws.cash, 300);
  assert.equal(row.balances.cash, 200);
});

test('supports cash-only funding when savings and private pensions are empty', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 60;
    value.household.essentialAnnual = 400;
    value.household.preferredAnnual = 400;
    value.people.forEach((person) => {
      person.age = 60;
      person.retirementAge = 60;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 70, annualAmount: 0 };
    });
    value.savings = { amount: 0, interestPct: 0 };
    value.cash = { amount: 900, interestPct: 0 };
    value.household.drawdownPriority = ['cash', 'savings', 'privatePension'];
  });

  const [row] = projectScenario(scenario);

  assert.equal(row.draws.cash, 400);
  assert.equal(row.balances.cash, 500);
  assert.equal(row.draws.savings, 0);
  assert.deepEqual(row.draws.privatePension, [0, 0]);
});

test('distinguishes a preferred shortfall from an essential shortfall', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 60;
    value.household.essentialAnnual = 400;
    value.household.preferredAnnual = 700;
    value.people.forEach((person) => {
      person.age = 60;
      person.retirementAge = 60;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 60, annualAmount: 250 };
    });
    value.savings = { amount: 0, interestPct: 0 };
    value.cash = { amount: 0, interestPct: 0 };
  });

  const [row] = projectScenario(scenario);

  assert.equal(row.income.total, 500);
  assert.equal(row.spending.essentialShortfall, 0);
  assert.equal(row.spending.preferredShortfall, 200);
  assert.equal(row.spending.essentialCovered, true);
});

test('converts inflated nominal values back to today\'s money', () => {
  const scenario = fixture((value) => {
    value.startYear = 2030;
    value.household.endAge = 61;
    value.household.essentialAnnual = 100;
    value.household.preferredAnnual = 100;
    value.household.inflationPct = 10;
    value.people.forEach((person) => {
      person.age = 60;
      person.retirementAge = 60;
      person.privatePension = { pot: 0, growthPct: 0 };
      person.statePension = { startAge: 70, annualAmount: 0 };
    });
    value.savings = { amount: 0, interestPct: 0 };
    value.cash = { amount: 300, interestPct: 0 };
  });

  const rows = projectScenario(scenario);

  assert.ok(Math.abs(rows[1].nominal.spending.essential - 110) < 1e-9);
  assert.ok(Math.abs(rows[1].todaysMoney.spending.essential - 100) < 1e-9);
  assert.ok(Math.abs(rows[1].nominal.spending.preferred - 110) < 1e-9);
  assert.ok(Math.abs(rows[1].todaysMoney.spending.preferred - 100) < 1e-9);
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
      assert.ok(Math.abs(balance - (previous.privatePension[index] + row.contributions[index] + row.growth.privatePension[index] - row.draws.privatePension[index] - row.lumpSumDraws.privatePension[index])) < 1e-9);
    });
    assert.ok(Math.abs(row.balances.savings - (previous.savings + row.growth.savings - row.draws.savings - row.lumpSumDraws.savings)) < 1e-9);
    assert.ok(Math.abs(row.balances.cash - (previous.cash + row.growth.cash - row.draws.cash - row.lumpSumDraws.cash)) < 1e-9);
    previous = {
      privatePension: row.balances.privatePension,
      savings: row.balances.savings,
      cash: row.balances.cash
    };
  }
});

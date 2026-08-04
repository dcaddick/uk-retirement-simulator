import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'uk-retirement-simulator.html'), 'utf8');
const match = html.match(/\/\* ENGINE_START \*\/([\s\S]*?)\/\* ENGINE_END \*\//);
assert.ok(match, 'HTML must contain marked engine code');

const context = { console };
vm.runInNewContext(`globalThis.window = globalThis;${match[1]}`, context);
const { SCHEMA_VERSION, sampleScenario, validateScenario, migrateScenario } = context;

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

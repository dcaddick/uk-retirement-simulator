import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(path.join(root, 'uk-retirement-simulator.html')).href;
const out = process.env.SCREENSHOT_DIR ?? path.join(root, 'output', 'playwright');
fs.mkdirSync(out, { recursive: true });
// PLAYWRIGHT_CHROMIUM lets a machine with its own browser build override the default.
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}
);
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.goto(file);
await page.waitForTimeout(400);

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `, ${detail}` : ''}`);
};

// 1. Baseline render
const cards = await page.locator('.summary-card').count();
check('summary cards render', cards === 4, `${cards} cards`);
const bars = await page.locator('#annual-chart rect.chart-bar').count();
check('chart bars render', bars > 0, `${bars} bars`);
const rows = await page.locator('#results-table tbody tr').count();
check('table rows render', rows > 0, `${rows} rows`);

// 2. Status colour actually applied (not just class present)
const firstCard = page.locator('.summary-card').first();
const cardClass = await firstCard.getAttribute('class');
const strongColour = await firstCard.locator('strong').evaluate((n) => getComputedStyle(n).color);
check('summary card carries status class', /good|warn|bad/.test(cardClass), cardClass);
check('status colour resolves', strongColour !== 'rgb(231, 238, 245)', strongColour);

// 3. Chart series colour resolves from token (not literal var string)
const barFill = await page.locator('#annual-chart rect.chart-bar').first().evaluate((n) => getComputedStyle(n).fill);
check('chart bar fill resolves from token', barFill.startsWith('rgb'), barFill);

// 4. Theme toggle
const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.click('#theme-toggle');
await page.waitForTimeout(300);
const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const themeAttr = await page.evaluate(() => document.documentElement.dataset.theme);
const pressed = await page.getAttribute('#theme-toggle', 'aria-pressed');
check('theme toggles', themeAttr === 'light' && darkBg !== lightBg, `${darkBg} -> ${lightBg}`);
check('aria-pressed updates', pressed === 'true', pressed);
const lightBarFill = await page.locator('#annual-chart rect.chart-bar').first().evaluate((n) => getComputedStyle(n).fill);
check('chart follows theme', lightBarFill !== barFill, `${barFill} -> ${lightBarFill}`);
await page.screenshot({ path: path.join(out, 'light.png'), fullPage: true });

await page.click('#theme-toggle');
await page.waitForTimeout(300);
check('theme toggles back', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
await page.screenshot({ path: path.join(out, 'dark.png'), fullPage: true });

// 5. Validation summary
await page.fill('[data-field="people[0].age"]', '-5');
await page.waitForTimeout(300);
const summaryVisible = await page.locator('#validation-summary').isVisible();
const entries = await page.locator('#validation-summary-list li').count();
const entryText = await page.locator('#validation-summary-list button').first().textContent();
check('validation summary appears', summaryVisible && entries > 0, `${entries} entries`);
check('entry uses human label', /Current age/.test(entryText), entryText?.trim());

// 6. Summary entry focuses the field
await page.locator('#validation-summary-list button').first().click();
await page.waitForTimeout(200);
const focused = await page.evaluate(() => document.activeElement?.dataset?.field);
check('summary entry focuses field', focused === 'people[0].age', String(focused));

await page.fill('[data-field="people[0].age"]', '58');
await page.waitForTimeout(300);
check('validation summary clears', !(await page.locator('#validation-summary').isVisible()));

// 7. Invalid field gets visible treatment
await page.fill('[data-field="people[0].age"]', '-5');
await page.waitForTimeout(250);
const invalidShadow = await page.locator('[data-field="people[0].age"]').evaluate((n) => getComputedStyle(n).boxShadow);
check('invalid field visibly marked', invalidShadow !== 'none', invalidShadow);
await page.fill('[data-field="people[0].age"]', '58');
await page.waitForTimeout(250);

// 8. Confirm modal, cancel path
await page.fill('[data-field="people[0].salary"]', '99000');
await page.waitForTimeout(250);
await page.click('#new-scenario-header');
await page.waitForTimeout(200);
check('modal opens', await page.locator('#confirm-modal').isVisible());
check('modal focuses confirm', (await page.evaluate(() => document.activeElement?.id)) === 'confirm-modal-ok');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('escape closes modal', !(await page.locator('#confirm-modal').isVisible()));
check('cancel preserves scenario', (await page.inputValue('[data-field="people[0].salary"]')) === '99000');
check('focus returns to invoker', (await page.evaluate(() => document.activeElement?.id)) === 'new-scenario-header');

// 9. Confirm modal, confirm path
await page.click('#new-scenario-header');
await page.waitForTimeout(200);
await page.click('#confirm-modal-ok');
await page.waitForTimeout(300);
check('confirm resets scenario', (await page.inputValue('[data-field="people[0].salary"]')) === '45000');
check('modal closed after confirm', !(await page.locator('#confirm-modal').isVisible()));

// 10. Splitter keyboard resize
const before = await page.locator('.sidebar').evaluate((n) => n.getBoundingClientRect().width);
await page.focus('#splitter');
for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(250);
const after = await page.locator('.sidebar').evaluate((n) => n.getBoundingClientRect().width);
check('splitter resizes by keyboard', after > before + 30, `${Math.round(before)} -> ${Math.round(after)}`);

// 11. Preferences persist across reload
await page.click('#theme-toggle');
await page.waitForTimeout(200);
await page.reload();
await page.waitForTimeout(400);
check('theme persists', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
const persistedWidth = await page.locator('.sidebar').evaluate((n) => n.getBoundingClientRect().width);
check('width persists', persistedWidth > before + 30, `${Math.round(persistedWidth)}`);
await page.click('#theme-toggle');
await page.waitForTimeout(200);

// 12. Mobile layout
await page.setViewportSize({ width: 390, height: 850 });
await page.waitForTimeout(300);
const splitterHidden = await page.locator('#splitter').isHidden();
const bodyScrolls = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('splitter hidden on mobile', splitterHidden);
check('no horizontal page scroll on mobile', !bodyScrolls);
await page.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });


// 13. Lump sums: collapse, summary, persistence of open state
await page.setViewportSize({ width: 1440, height: 980 });
await page.click('summary:has(h2:text-is("Lump sum withdrawals"))');
await page.click('#add-lump-sum');
await page.waitForTimeout(250);
check('new lump row starts expanded', (await page.getAttribute('.lump-sum-row [data-lump-toggle]', 'aria-expanded')) === 'true');
await page.fill('.lump-sum-row [data-lump-field="age"]', '70');
await page.fill('.lump-sum-row [data-lump-field="amount"]', '25000');
await page.fill('.lump-sum-row [data-lump-field="label"]', 'Kitchen refit');
await page.waitForTimeout(300);
check('summary tracks amount live', (await page.textContent('.lump-summary-amount'))?.includes('25,000'), await page.textContent('.lump-summary-amount'));
check('summary tracks description live', (await page.textContent('.lump-summary-reason')) === 'Kitchen refit');
check('summary tracks age live', (await page.textContent('.lump-summary-date')) === 'Age 70');
await page.click('.lump-sum-row [data-lump-toggle]');
await page.waitForTimeout(200);
check('row collapses', await page.locator('.lump-editor').isHidden());
check('collapsed row keeps summary visible', await page.locator('.lump-summary-amount').isVisible());
check('toggle reports collapsed', (await page.getAttribute('.lump-sum-row [data-lump-toggle]', 'aria-expanded')) === 'false');
// Table is in today's pounds, so assert the lump-sum column is funded rather
// than matching the nominal figure. Switch to future pounds to confirm the amount.
const lumpCell = await page.locator('#results-table tbody tr').filter({ hasText: '2038 / 70' }).first().locator('td').nth(2).textContent();
check('collapsed row still feeds the projection', lumpCell !== '\u00a30', lumpCell);
await page.selectOption('#display-mode', 'nominal');
await page.waitForTimeout(250);
const lumpNominal = await page.locator('#results-table tbody tr').filter({ hasText: '2038 / 70' }).first().locator('td').nth(2).textContent();
check('lump sum is the nominal amount entered', lumpNominal === '\u00a325,000', lumpNominal);
await page.selectOption('#display-mode', 'todaysMoney');
await page.waitForTimeout(250);

// 14. Collapsed row with an invalid field is reachable via the summary
await page.click('.lump-sum-row [data-lump-toggle]');
await page.waitForTimeout(150);
await page.fill('.lump-sum-row [data-lump-field="amount"]', '-100');
await page.click('.lump-sum-row [data-lump-toggle]');
await page.waitForTimeout(300);
check('collapsed invalid row listed in summary', (await page.locator('#validation-summary-list li').count()) > 0);
await page.locator('#validation-summary-list button').first().click();
await page.waitForTimeout(250);
check('summary expands collapsed editor', await page.locator('.lump-editor').isVisible());
check('summary focuses the lump field', (await page.evaluate(() => document.activeElement?.dataset?.lumpField)) === 'amount');
await page.fill('.lump-sum-row [data-lump-field="amount"]', '25000');
await page.waitForTimeout(250);

// 15. Second row, then remove the first, indices must follow
await page.click('#add-lump-sum');
await page.waitForTimeout(200);
await page.fill('.lump-sum-row:nth-child(2) [data-lump-field="age"]', '75');
await page.waitForTimeout(150);
await page.fill('.lump-sum-row:nth-child(2) [data-lump-field="amount"]', '-9');
await page.waitForTimeout(300);
await page.locator('.lump-sum-row').first().locator('[data-remove-lump-sum]').click();
await page.waitForTimeout(300);
const remaining = await page.locator('.lump-sum-row').count();
const idx = await page.getAttribute('.lump-sum-row', 'data-lump-index');
check('one row remains after removal', remaining === 1, `${remaining}`);
check('remaining row reindexed to 0', idx === '0', String(idx));
await page.locator('#validation-summary-list button').first().click();
await page.waitForTimeout(250);
const focusedRow = await page.evaluate(() => document.activeElement?.closest('.lump-sum-row')?.dataset?.lumpIndex);
check('error targets the surviving row', focusedRow === '0', String(focusedRow));
await page.screenshot({ path: path.join(out, 'lump.png'), fullPage: false });

console.log(problems.length ? `\nCONSOLE PROBLEMS:\n${problems.join('\n')}` : '\nNo console or page errors.');
await browser.close();
console.log(`\n${failures === 0 && problems.length === 0 ? 'All checks passed.' : `${failures} failed check(s), ${problems.length} console problem(s).`}`);
process.exit(failures === 0 && problems.length === 0 ? 0 : 1);

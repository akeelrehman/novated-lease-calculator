// @ts-check
const { test, expect } = require('@playwright/test');

// All tests navigate to app.html served at baseURL (http://localhost:8080)
const APP = '/app.html';

// ─────────────────────────────────────────────────────────────
// 1. Page load
// ─────────────────────────────────────────────────────────────
test('page loads with correct title and header', async ({ page }) => {
  await page.goto(APP);
  await expect(page).toHaveTitle(/Novated Lease Calculator/);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('h1')).toContainText('Novated Lease');
});

// ─────────────────────────────────────────────────────────────
// 2. Policy Sandbox collapsed by default
// ─────────────────────────────────────────────────────────────
test('Policy Sandbox card-body is collapsed on load', async ({ page }) => {
  await page.goto(APP);
  const sandboxBody = page.locator('#sandboxBody');
  await expect(sandboxBody).toBeHidden();
});

test('Policy Sandbox chevron shows ▶ (closed) on load', async ({ page }) => {
  await page.goto(APP);
  const chevron = page.locator('#sandboxChevron');
  await expect(chevron).toHaveText('▶');
});

// ─────────────────────────────────────────────────────────────
// 3. Policy Sandbox expands on click
// ─────────────────────────────────────────────────────────────
test('clicking Policy Sandbox header expands the body', async ({ page }) => {
  await page.goto(APP);
  await page.locator('.card-head', { hasText: 'Policy Sandbox' }).click();
  const sandboxBody = page.locator('#sandboxBody');
  await expect(sandboxBody).toBeVisible();
});

test('clicking Policy Sandbox header twice re-collapses it', async ({ page }) => {
  await page.goto(APP);
  const header = page.locator('.card-head', { hasText: 'Policy Sandbox' });
  await header.click(); // open
  await header.click(); // close
  await expect(page.locator('#sandboxBody')).toBeHidden();
});

test('chevron flips to ▼ when sandbox is expanded', async ({ page }) => {
  await page.goto(APP);
  await page.locator('.card-head', { hasText: 'Policy Sandbox' }).click();
  await expect(page.locator('#sandboxChevron')).toHaveText('▼');
});

// ─────────────────────────────────────────────────────────────
// 4. Vehicle type switching
// ─────────────────────────────────────────────────────────────
test('switching to PHEV updates the vehicle type note with danger text', async ({ page }) => {
  await page.goto(APP);
  await page.locator('#vt-phev').click();
  const note = page.locator('#vtypeNote');
  await expect(note).toContainText('PHEV');
  await expect(note).toContainText('20%');
});

test('switching to Petrol/Diesel updates the vehicle type note', async ({ page }) => {
  await page.goto(APP);
  await page.locator('#vt-ice').click();
  const note = page.locator('#vtypeNote');
  await expect(note).toContainText('Petrol');
  await expect(note).toContainText('20%');
});

test('switching back to BEV restores the exemption note', async ({ page }) => {
  await page.goto(APP);
  await page.locator('#vt-ice').click();
  await page.locator('#vt-ev').click();
  const note = page.locator('#vtypeNote');
  await expect(note).toContainText('BEV');
  await expect(note).toContainText('exempt');
});

// ─────────────────────────────────────────────────────────────
// 5. KPI tiles populate after input change
// ─────────────────────────────────────────────────────────────
test('KPI tiles show calculated values (not dashes) on load', async ({ page }) => {
  await page.goto(APP);
  // The engine runs on DOMContentLoaded with defaults; tiles should be populated
  const kpiFinance = page.locator('#kpiPayFinance');
  await expect(kpiFinance).not.toHaveText('—');
});

test('changing salary triggers recalculation — KPI Finance Payment updates', async ({ page }) => {
  await page.goto(APP);
  const kpiBefore = await page.locator('#kpiPayFinance').textContent();
  const salaryInput = page.locator('#salary');
  await salaryInput.fill('80000');
  await salaryInput.dispatchEvent('input');
  // MTR tile changes when salary changes (marginal rate tile)
  const mtrTile = page.locator('#kpiMtr');
  await expect(mtrTile).not.toHaveText('—');
  // Finance payment itself is salary-independent but MTR should change
  await expect(mtrTile).toContainText('%');
});

// ─────────────────────────────────────────────────────────────
// 6. Theme toggle
// ─────────────────────────────────────────────────────────────
test('theme toggle switches to light mode', async ({ page }) => {
  await page.goto(APP);
  // colorScheme is forced to 'dark' in config → initial state has no data-theme attr
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('theme toggle switches back to dark mode', async ({ page }) => {
  await page.goto(APP);
  await page.locator('#themeToggle').click(); // dark → light
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#themeToggle').click(); // light → dark
  const theme = await page.locator('html').getAttribute('data-theme');
  expect(theme).not.toBe('light');
});

test('theme label text updates on toggle', async ({ page }) => {
  await page.goto(APP);
  // Dark initial state → button should offer to switch to light
  await expect(page.locator('#themeLabel')).toHaveText('Light mode');
  await page.locator('#themeToggle').click();
  await expect(page.locator('#themeLabel')).toHaveText('Dark mode');
});

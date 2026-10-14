#!/usr/bin/env node
/**
 * Puppeteer smoke: loyalty lost-card recover (#372).
 * Enables program if needed, joins a member via API, recovers on /loyalty/{tenantId},
 * then checks staff member search + copy card link.
 *
 * Usage (from repo root):
 *   npm run test:loyalty-recover --prefix front
 *
 * Env: BASE_URL; LOGIN_EMAIL / LOGIN_PASSWORD (or DEMO_LOGIN_*); TENANT_ID; HEADLESS
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const repoRoot = resolve(__dirname, '..', '..');

function loadEnv() {
  const envPath = join(repoRoot, '.env');
  if (existsSync(envPath)) {
    try {
      readFileSync(envPath, 'utf8')
        .split('\n')
        .forEach((line) => {
          const m = line.match(/^([^#=]+)=(.*)$/);
          if (m && !process.env[m[1].trim()]) {
            process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
          }
        });
    } catch (_) {}
  }
}
loadEnv();

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TENANT_ID = Number(process.env.TENANT_ID || process.env.LOGIN_TENANT_ID || 1);
const UNIQUE = `recover372.${Date.now()}@amvara.de`;

async function detectBaseUrl() {
  let baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    for (const port of [4203, 4202, 4200]) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`, {
          method: 'head',
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok || res.status < 500) {
          baseUrl = `http://127.0.0.1:${port}`;
          break;
        }
      } catch (_) {}
    }
    baseUrl = baseUrl || 'http://127.0.0.1:4202';
  }
  return baseUrl.replace(/\/$/, '');
}

async function main() {
  const baseUrl = await detectBaseUrl();
  const headless = isHeadless();
  const loginEmail =
    process.env.LOGIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.DEMO_LOGIN_EMAIL;
  const loginPassword =
    process.env.LOGIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    process.env.DEMO_LOGIN_PASSWORD;

  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  console.log('Tenant:', TENANT_ID);
  if (!loginEmail || !loginPassword) {
    console.error(
      'Credentials required: set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_* in .env.',
    );
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fails = [];
  const api = `${baseUrl}/api`;

  try {
    console.log('1. Staff login…');
    await page.goto(new URL(`/login?tenant=${TENANT_ID}`, baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(4000);
    }
    if (page.url().includes('/login')) {
      fails.push('still on login');
      throw new Error(fails.join('; '));
    }

    console.log('2. Enable loyalty + join member via API…');
    const pageEnable = await page.evaluate(
      async (apiUrl) => {
        const r = await fetch(`${apiUrl}/loyalty/program`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: true,
            program_name: 'Recover Club',
            mode: 'points',
            earn_units_per_order: 1,
            redemption_threshold: 10,
            reward_discount_cents: 500,
          }),
        });
        return { ok: r.ok, status: r.status, text: await r.text() };
      },
      api,
    );
    if (!pageEnable.ok) {
      fails.push(`enable program failed: ${pageEnable.status} ${pageEnable.text}`);
      throw new Error(fails.join('; '));
    }

    const joinRes = await fetch(`${api}/public/tenants/${TENANT_ID}/loyalty/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: 'Recover Smoke',
        email: UNIQUE,
      }),
    });
    const joinBody = await joinRes.json().catch(() => ({}));
    if (!joinRes.ok || !joinBody?.membership?.member_token) {
      fails.push(`join failed: ${joinRes.status} ${JSON.stringify(joinBody)}`);
      throw new Error(fails.join('; '));
    }
    const memberToken = joinBody.membership.member_token;
    console.log('   Joined member token prefix:', memberToken.slice(0, 8));

    console.log('3. Public recover UI…');
    await page.goto(new URL(`/loyalty/${TENANT_ID}`, baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await page.waitForSelector('[data-testid="loyalty-recover-section"]', {
      timeout: 15000,
    });
    await page.type('[data-testid="loyalty-recover-email"]', UNIQUE);
    await page.click('[data-testid="loyalty-recover-submit"]');
    await page.waitForSelector('[data-testid="loyalty-card-link"]', { timeout: 15000 });
    const cardText = await page.$eval(
      '[data-testid="loyalty-card-link"]',
      (el) => el.textContent || '',
    );
    if (!cardText.includes(memberToken)) {
      fails.push(`card link missing token: ${cardText}`);
    }
    const openCard = await page.$('[data-testid="loyalty-open-card"]');
    if (!openCard) fails.push('open card button missing');

    console.log('4. Staff members search + copy…');
    await page.goto(new URL('/settings', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await sleep(1500);
    const tab = await page.$('[data-testid="settings-loyalty-tab"]');
    if (!tab) {
      fails.push('loyalty tab missing');
    } else {
      await tab.click();
      await sleep(1500);
      await page.waitForSelector('[data-testid="loyalty-members-search"]', {
        timeout: 10000,
      });
      await page.click('[data-testid="loyalty-members-search"]', { clickCount: 3 });
      await page.type('[data-testid="loyalty-members-search"]', UNIQUE);
      await sleep(800);
      const copyBtn = await page.$('[data-testid="loyalty-copy-card-link"]');
      if (!copyBtn) fails.push('copy card link button missing after search');
    }

    await browser.close();
    if (fails.length) {
      console.error('FAIL:', fails.join('; '));
      process.exit(1);
    }
    console.log('\n>>> RESULT: Loyalty recover smoke passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    try {
      await browser.close();
    } catch (_) {}
    process.exit(1);
  }
}

main();

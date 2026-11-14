import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1080, height: 675 } });
await p.goto('file:///C:/Users/张一/WorkBuddy/spaces/2026_11_12_22-57-34/guhua/shots/01-first-screen.png');
await p.screenshot({ path: 'shots/_preview.png' });
await b.close();
console.log('ok');

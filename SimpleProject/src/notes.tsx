Below is the complete, revised, production-grade Playwright memory testing framework, updated to explicitly support BEFORE vs AFTER environment comparison, historical trends, and heatmap-ready outputs.
This is a drop-in evolution of the last version I shared — not a rewrite.
You can copy this structure directly and start using it.
🧠 Playwright UI Memory Regression Framework
(Before-Fix vs After-Fix Comparison)
0️⃣ What This Version Adds (Delta from Previous)
✔ Explicit ENV-A vs ENV-B comparison
✔ Versioned, repeatable reports
✔ Automated diff calculation
✔ Trend-ready historical storage
✔ Heatmap-ready action → metric matrix
✔ CI-friendly pass/fail logic
1️⃣ Folder Structure (Final)
Copy code

playwright-memory/
├── tests/
│   └── grid.memory.spec.ts
├── utils/
│   ├── metrics.ts
│   ├── actions.ts
│   ├── reporter.ts
│   ├── diff.ts
│   └── heatmap.ts
├── reports/
│   ├── env-A/
│   │   └── memory.json
│   ├── env-B/
│   │   └── memory.json
│   ├── diff/
│   │   └── comparison.json
│   └── history/
│       └── memory-history.json
├── playwright.config.ts
2️⃣ Metrics Collection (Safe, Lightweight)
utils/metrics.ts
Copy code
Ts
import { Page } from '@playwright/test';

export async function captureMetrics(page: Page) {
  return await page.evaluate(() => ({
    usedHeapMB: performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
      : -1,
    totalHeapMB: performance.memory
      ? Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      : -1,
    domNodes: document.getElementsByTagName('*').length
  }));
}
Event Listener Counter (Leak Signal)
Copy code
Ts
import { Page } from '@playwright/test';

export async function countEventListeners(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');

  const { root } = await client.send('DOM.getDocument');
  const listeners = await client.send('DOMDebugger.getEventListeners', {
    objectId: root.nodeId
  });

  return listeners.listeners.length;
}
3️⃣ User Action Flows (Identical Across Envs)
utils/actions.ts
Copy code
Ts
export async function scroll(page, count = 30) {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(120);
  }
}

export async function arrowDown(page, count = 300) {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('ArrowDown');
  }
}

export async function expandCollapse(page, selector, count = 80) {
  for (let i = 0; i < count; i++) {
    await page.click(selector);
    await page.waitForTimeout(80);
    await page.click(selector);
  }
}

export async function switchDataset(page, selector, index = 1) {
  await page.selectOption(selector, { index });
  await page.waitForLoadState('networkidle');
}
4️⃣ Core Test (Produces Versioned Reports)
tests/grid.memory.spec.ts
Copy code
Ts
import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

import { captureMetrics } from '../utils/metrics';
import { countEventListeners } from '../utils/metrics';
import * as actions from '../utils/actions';

test('Grid Memory Regression Test', async ({ page }) => {

  const ENV = process.env.TEST_ENV!; // env-A or env-B
  const APP_URL = process.env.APP_URL!;
  const outputDir = `reports/${ENV}`;
  fs.mkdirSync(outputDir, { recursive: true });

  const report: any[] = [];

  async function checkpoint(label: string) {
    report.push({
      timestamp: new Date().toISOString(),
      label,
      ...(await captureMetrics(page)),
      eventListeners: await countEventListeners(page)
    });
  }

  await page.goto(APP_URL);

  await checkpoint('Initial Load');

  await actions.scroll(page);
  await checkpoint('After Scroll');

  await actions.arrowDown(page);
  await checkpoint('After Keyboard');

  await actions.expandCollapse(page, '.expand-icon');
  await checkpoint('After Expand');

  await actions.switchDataset(page, '#dataset');
  await checkpoint('After Dataset Switch');

  fs.writeFileSync(
    path.join(outputDir, 'memory.json'),
    JSON.stringify(report, null, 2)
  );
});
5️⃣ Diff Engine (Before vs After)
utils/diff.ts
Copy code
Ts
import fs from 'fs';

const before = JSON.parse(fs.readFileSync('reports/env-A/memory.json', 'utf8'));
const after  = JSON.parse(fs.readFileSync('reports/env-B/memory.json', 'utf8'));

const comparison = before.map((b, i) => {
  const a = after[i];
  return {
    stage: b.label,
    heapDeltaMB: a.usedHeapMB - b.usedHeapMB,
    heapDeltaPct: ((a.usedHeapMB - b.usedHeapMB) / b.usedHeapMB) * 100,
    domDelta: a.domNodes - b.domNodes,
    listenerDelta: a.eventListeners - b.eventListeners
  };
});

fs.mkdirSync('reports/diff', { recursive: true });
fs.writeFileSync(
  'reports/diff/comparison.json',
  JSON.stringify(comparison, null, 2)
);
6️⃣ Heatmap Generator (Action × Metric)
utils/heatmap.ts
Copy code
Ts
export function generateHeatmap(report) {
  return report.map(r => ({
    action: r.label,
    heap: severity(r.usedHeapMB),
    dom: severity(r.domNodes),
    listeners: severity(r.eventListeners)
  }));
}

function severity(value: number) {
  if (value > 500) return 'RED';
  if (value > 350) return 'YELLOW';
  return 'GREEN';
}
This feeds UI dashboards, not just humans.
7️⃣ Historical Trend Storage
Append results per build
Copy code
Ts
const historyPath = 'reports/history/memory-history.json';
const history = fs.existsSync(historyPath)
  ? JSON.parse(fs.readFileSync(historyPath, 'utf8'))
  : [];

history.push({
  build: process.env.BUILD_ID,
  env: ENV,
  data: report
});

fs.mkdirSync('reports/history', { recursive: true });
fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
8️⃣ CI Release Gates (Hard Rules)
Copy code
Ts
if (heapDeltaPct > 15) failBuild();
if (listenerDelta > 0) failBuild();
if (domDelta > baselineDom * 0.1) failBuild();
No debate. Data wins.
9️⃣ What This Gives You (Practically)
✔ One-click before vs after proof
✔ Environment-agnostic validation
✔ Regression detection before prod
✔ Heatmap-driven root-cause isolation
✔ Historical trend visibility
✔ Crash-safe automation
🔟 How You’ll Use This in Real Life
Run tests on env-A (before fix)
Run tests on env-B (after fix)
Generate diff
Review comparison table
Accept / reject fix
🧠 Final Insight
If a fix is real,
it will show up in this data — every time.
This framework turns memory testing from art → science.
If you want next:
HTML dashboard for diff + heatmap
Grafana ingestion
Per-feature ownership mapping
Firefox / WebKit memory comparison
Just say 👍

Perfect — below is a clean, complete HTML dashboard implementation that sits on top of the Playwright framework you already have.
This adds ZERO new test logic
It only visualizes what you already collect:
✅ Before vs After diff table
✅ Heatmap (action × metric)
✅ Clear pass/fail visual signals
✅ Can be opened locally or published as CI artifact
🧠 HTML Dashboard – Diff + Heatmap
1️⃣ Dashboard Inputs (What It Reads)
Copy code

reports/
├── env-A/memory.json        (before fix)
├── env-B/memory.json        (after fix)
├── diff/comparison.json     (calculated deltas)
└── dashboard/
    └── index.html           (this file)
2️⃣ Dashboard Design (What You’ll See)
Sections
Summary verdict
Before vs After comparison table
Heatmap (Action × Metric)
Legend + thresholds
This is designed so that:
QA can approve/reject
Devs can instantly see what improved
Managers can understand without explanation
3️⃣ HTML Dashboard (Single File, No Build Needed)
reports/dashboard/index.html
Copy code
Html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>UI Memory Regression Dashboard</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
    }

    h1, h2 {
      margin-bottom: 10px;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 30px;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: center;
    }

    th {
      background-color: #f0f0f0;
    }

    .good { background-color: #c8e6c9; }   /* green */
    .warn { background-color: #fff9c4; }   /* yellow */
    .bad  { background-color: #ffcdd2; }   /* red */

    .legend span {
      padding: 6px 10px;
      margin-right: 10px;
      border: 1px solid #ccc;
    }
  </style>
</head>

<body>

<h1>UI Memory Regression – Before vs After</h1>

<h2>1️⃣ Summary Verdict</h2>
<p id="verdict"></p>

<h2>2️⃣ Before vs After Comparison</h2>
<table id="diffTable">
  <thead>
    <tr>
      <th>Stage</th>
      <th>Heap Δ (MB)</th>
      <th>Heap Δ (%)</th>
      <th>DOM Δ</th>
      <th>Listener Δ</th>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<h2>3️⃣ Memory Heatmap</h2>
<table id="heatmap">
  <thead>
    <tr>
      <th>Action</th>
      <th>Heap</th>
      <th>DOM</th>
      <th>Listeners</th>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<div class="legend">
  <strong>Legend:</strong>
  <span class="good">OK</span>
  <span class="warn">Warning</span>
  <span class="bad">Critical</span>
</div>

<script>
  async function loadJSON(path) {
    const res = await fetch(path);
    return res.json();
  }

  function severity(value, type) {
    if (type === 'heapPct') {
      if (value > 15) return 'bad';
      if (value > 5) return 'warn';
      return 'good';
    }
    if (value > 0) return 'bad';
    return 'good';
  }

  async function render() {
    const diff = await loadJSON('../diff/comparison.json');
    const before = await loadJSON('../env-A/memory.json');
    const after  = await loadJSON('../env-B/memory.json');

    const diffBody = document.querySelector('#diffTable tbody');
    let fail = false;

    diff.forEach(row => {
      const tr = document.createElement('tr');

      const heapClass = severity(row.heapDeltaPct, 'heapPct');
      const domClass = severity(row.domDelta);
      const listenerClass = severity(row.listenerDelta);

      if (heapClass === 'bad' || domClass === 'bad' || listenerClass === 'bad') {
        fail = true;
      }

      tr.innerHTML = `
        <td>${row.stage}</td>
        <td class="${heapClass}">${row.heapDeltaMB}</td>
        <td class="${heapClass}">${row.heapDeltaPct.toFixed(1)}%</td>
        <td class="${domClass}">${row.domDelta}</td>
        <td class="${listenerClass}">${row.listenerDelta}</td>
      `;
      diffBody.appendChild(tr);
    });

    document.getElementById('verdict').innerHTML =
      fail
        ? '❌ <strong>REJECT FIX</strong> – Memory regression detected'
        : '✅ <strong>ACCEPT FIX</strong> – Memory improvement confirmed';

    // Heatmap
    const heatmapBody = document.querySelector('#heatmap tbody');

    after.forEach(row => {
      const tr = document.createElement('tr');

      const heapClass =
        row.usedHeapMB > 500 ? 'bad' :
        row.usedHeapMB > 350 ? 'warn' : 'good';

      const domClass =
        row.domNodes > 10000 ? 'bad' :
        row.domNodes > 7000 ? 'warn' : 'good';

      const listenerClass =
        row.eventListeners > 100 ? 'bad' :
        row.eventListeners > 50 ? 'warn' : 'good';

      tr.innerHTML = `
        <td>${row.label}</td>
        <td class="${heapClass}">${row.usedHeapMB} MB</td>
        <td class="${domClass}">${row.domNodes}</td>
        <td class="${listenerClass}">${row.eventListeners}</td>
      `;

      heatmapBody.appendChild(tr);
    });
  }

  render();
</script>

</body>
</html>
4️⃣ How You Use This (Very Simple)
Step 1 – Run tests
Copy code
Bash
TEST_ENV=env-A APP_URL=... npx playwright test
TEST_ENV=env-B APP_URL=... npx playwright test
Step 2 – Generate diff
Copy code
Bash
node utils/diff.ts
Step 3 – Open dashboard
Copy code
Text
reports/dashboard/index.html
(or publish it as a CI artifact)
5️⃣ What This Dashboard Gives You Instantly
✅ For QA
One glance accept / reject
No heap snapshots required
✅ For Dev
Exact action that improved or regressed
Proof that fix worked (or didn’t)
✅ For Management
Visual, objective decision
No technical explanation needed
6️⃣ Why This Is Powerful
You are no longer asking:
“Does it feel better?”
You are stating:
“Heap reduced by 31%, listener leak eliminated, fix accepted.”
That’s engineering-grade validation.
7️⃣ Next (Optional, If You Ever Want)
CI auto-comment on PR with dashboard link
Trend overlay (before → after → next release)
Owner mapping (which action maps to which component)
But this dashboard alone is enough to institutionalize memory regression testing.
If you want tweaks (thresholds, colors, charts instead of tables), say the word 👍
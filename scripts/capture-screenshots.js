import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const distDir = path.resolve('dist');
const imagesDir = path.resolve('images');
const screenshotsDir = path.join(imagesDir, 'screenshots');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const saveScreenshot = async (page, filename) => {
  const buffer = await page.screenshot();
  const pScreenshot = path.join(screenshotsDir, filename);
  fs.writeFileSync(pScreenshot, buffer);
  try {
    const pImage = path.join(imagesDir, filename);
    fs.writeFileSync(pImage, buffer);
  } catch {
    // Non-fatal fallback for legacy path
  }
  console.log(`Saved ${filename} to images/screenshots/`);
};

// 1. Static file server for dist/
const staticServer = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(distDir, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

// 2. Mock Ollama server on 11434
const ollamaServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];
  if (url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Ollama is running');
    return;
  }

  if (url === '/api/tags' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      models: [
        { name: 'qwen3:14b', size: 9000000000, modified_at: '2026-09-24T00:00:00Z' },
        { name: 'deepseek-r1:14b', size: 9000000000, modified_at: '2026-09-24T00:00:00Z' },
        { name: 'llama3.3:70b', size: 40000000000, modified_at: '2026-09-24T00:00:00Z' }
      ]
    }));
    return;
  }

  if (url === '/api/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}');
      const responseText = `by the court or public, risking rejection or sabotage.
* **Replication and Transmission**: Without written records or apprentices trained in the design, the knowledge of the automaton's construction may be lost after Leonardo's lifetime.

### Impact and Likelihood Assessment

1. **Mechanical Complexity** → **High Impact, High Likelihood**: Misalignment or jamming could halt the automaton mid-performance, undermining its purpose.
2. **Material Degradation** → **High Impact, Medium Likelihood**: Humidity or wear could cause parts to warp or break, especially in Milan's climate.
3. **Secrecy Compromise** → **High Impact, Medium Likelihood**: If the automaton's mechanism is exposed, its "magic" is lost, reducing its appeal.
4. **Power Source Failure** → **High Impact, Medium Likelihood**: A crank or hidden mechanism may fail during a demonstration, rendering the automaton useless.
5. **Maintenance Challenges** → **High Impact, High Likelihood**: Without proper records or skilled artisans, repairs would be impossible.
6. **Social Rejection** → **Medium Impact, Low Likelihood**: Ludovico's court may support the automaton as a marvel, but public fear of "unnatural" machines could cause backlash.
7. **Knowledge Loss** → **High Impact, High Likelihood**: Without detailed blueprints or apprentices, the design may vanish after Leonardo's death.

### Actionable Recommendations

1. **Simplify Mechanisms**: Reduce the number of interdependent parts to minimize the risk of misalignment or jamming. Use modular components that can be replaced individually.
2. **Redundant Power Systems**: Integrate a secondary spring mechanism to prevent complete failure during demonstrations.
3. **Standardize Components**: Create repeatable measurement templates for all gear ratios and linkage pins.`;

      if (parsed.stream) {
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
        const lines = responseText.split('\n');
        for (let i = 0; i < lines.length; i++) {
          res.write(JSON.stringify({ response: lines[i] + '\n', done: false }) + '\n');
        }
        res.write(JSON.stringify({ response: '', done: true }) + '\n');
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          model: parsed.model || 'qwen3:14b',
          response: responseText,
          done: true
        }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  await new Promise(r => staticServer.listen(4173, '127.0.0.1', r));
  console.log('Static server listening on http://127.0.0.1:4173');

  await new Promise(r => ollamaServer.listen(11434, '127.0.0.1', r));
  console.log('Mock Ollama server listening on http://127.0.0.1:11434');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,975',
      '--font-render-hinting=none',
      '--force-color-profile=srgb',
    ],
    defaultViewport: {
      width: 1920,
      height: 975,
      deviceScaleFactor: 1,
    }
  });

  const page = await browser.newPage();

  // Load page to get domain origin for localStorage
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });

  const profileData = {
    settings: {
      language: 'en',
      apiKey: '',
      modelSource: 'Ollama',
      preferredModel: 'qwen3:14b',
      geminiModel: '',
      ollamaModel: 'qwen3:14b',
      openaiModel: '',
      maritacaModel: '',
      customModel: '',
      localGgufModel: '',
      localGgufModels: [],
      localGgufBackend: 'auto',
      localGgufContextSize: 8192,
      ollamaApiUrl: 'http://localhost:11434',
      openaiApiKey: '',
      geminiApiKey: '',
      maritacaApiKey: '',
      maritacaApiUrl: 'https://chat.maritaca.ai/api',
      customApiUrl: '',
      customApiKey: '',
      defaultFunctionId: 'fireproof_idea',
      defaultContextIds: ['ctx-da-vinci'],
      notificationEnabled: true,
      sidebarCollapsed: false
    },
    contexts: [
      {
        id: 'ctx-da-vinci',
        path: 'Obsidian Vault/Da Vinci - Milano - Automata Cavaliere (1495).md',
        remark: 'Da Vinci - Milano - Automata Cavaliere (1495)',
        type: 'file',
        isHidden: false,
        isUserAdded: true
      }
    ]
  };

  await page.evaluate((profile) => {
    localStorage.clear();
    localStorage.setItem('epitelos_profile', JSON.stringify(profile));
  }, profileData);

  // Reload with fresh profile and wait
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // --- 1. RUN AI (WORKSPACE) ---
  console.log('Setting up Workspace view...');

  // 1a. Select Function "Fireproof Idea"
  console.log('Selecting function Fireproof Idea...');
  const selectFunctionDropdownButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent && b.textContent.includes('Select function...'));
  });
  if (selectFunctionDropdownButton) {
    await selectFunctionDropdownButton.click();
    await sleep(300);
    // Find Fireproof Idea in the dropdown
    const fireproofBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Fireproof Idea'));
    });
    if (fireproofBtn) {
      await fireproofBtn.click();
      await sleep(300);
    }
  }

  // 1b. Select Context Checkbox
  console.log('Selecting context checkbox...');
  const contextCheckbox = await page.$('input[type="checkbox"]');
  if (contextCheckbox) {
    const isChecked = await page.evaluate(el => el.checked, contextCheckbox);
    if (!isChecked) {
      await contextCheckbox.click();
      await sleep(200);
    }
  }

  // 1c. Set User Prompt
  console.log('Setting prompt text...');
  const inputSelector = '#user-input';
  await page.waitForSelector(inputSelector);
  await page.$eval(inputSelector, el => el.rows = 2);
  await page.focus(inputSelector);
  await page.keyboard.type("Fireproof this idea as if you lived in 1495, don't judge it from modern concepts.");
  await sleep(200);

  // 1d. Toggle Stream switch
  console.log('Toggling Stream switch...');
  const streamToggle = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent && b.textContent.includes('Stream'));
  });
  if (streamToggle) {
    await streamToggle.click();
    await sleep(200);
  }

  // 1e. Click Run function button
  console.log('Triggering Run function...');
  const runBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent && b.textContent.includes('Run function'));
  });
  if (runBtn) {
    await runBtn.click();
  }

  // Wait for the mock Ollama response to finish streaming and render
  await page.waitForFunction(() => document.body.textContent.includes('Actionable Recommendations'), { timeout: 10000 });
  await sleep(1000);

  // Blur active element and move mouse away to clear focus and hover states
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(0, 0);
  await sleep(300);

  await saveScreenshot(page, 'run-ai.png');

  // --- 2. FUNCTIONS (FUNCTION MANAGER) ---
  console.log('Navigating to Functions...');
  const functionsNav = await page.waitForSelector('button[aria-label="Functions"]');
  await functionsNav.click();
  await sleep(600);
  await page.mouse.move(0, 0);
  await sleep(300);
  await saveScreenshot(page, 'functions.png');

  // --- 3. CONTEXT (SOURCES) ---
  console.log('Navigating to Sources...');
  const sourcesNav = await page.waitForSelector('button[aria-label="Sources"]');
  await sourcesNav.click();
  await sleep(600);
  await page.mouse.move(0, 0);
  await sleep(300);
  await saveScreenshot(page, 'context.png');

  // --- 4. HISTORY (ARCHIVES) ---
  console.log('Navigating to History...');
  const historyNav = await page.waitForSelector('button[aria-label="History"]');
  await historyNav.click();
  await sleep(800);
  await page.mouse.move(0, 0);
  await sleep(300);
  await saveScreenshot(page, 'history.png');

  // --- 5. SETTINGS (CONFIGURATION) ---
  console.log('Navigating to Settings...');
  const settingsNav = await page.waitForSelector('button[aria-label="Settings"]');
  await settingsNav.click();
  await sleep(1500); // Wait for verification status "Ollama connection successful."
  await page.mouse.move(0, 0);
  await sleep(300);
  await saveScreenshot(page, 'settings.png');

  await browser.close();
  staticServer.close();
  ollamaServer.close();
  console.log('All screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});

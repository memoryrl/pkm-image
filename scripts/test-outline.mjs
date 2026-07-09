import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const html = `<!DOCTYPE html><html><body><script type="module">
import { OUTLINE_PRESETS, convertToOutline } from '/src/utils/outlineConverter.js';

const img = new Image();
img.crossOrigin = 'anonymous';
img.onerror = () => { window.done = 'img-error'; };
img.onload = () => {
  try {
    const results = [];
    for (const preset of OUTLINE_PRESETS) {
      const canvas = document.createElement('canvas');
      convertToOutline(img, canvas, {
        maxSize: 1000,
        darknessDelta: preset.darknessDelta,
        maxLineLum: preset.maxLineLum,
        dilateRadius: preset.dilateRadius,
        minComponentSize: preset.minComponentSize,
        smoothRadius: preset.smoothRadius,
      });

      // 흰 배경에 합성한 검증용 이미지
      const flat = document.createElement('canvas');
      flat.width = canvas.width;
      flat.height = canvas.height;
      const fctx = flat.getContext('2d');
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, flat.width, flat.height);
      fctx.drawImage(canvas, 0, 0);

      results.push({ id: preset.id, data: flat.toDataURL('image/png') });
    }
    window.results = results;
    window.done = 'ok';
  } catch (e) {
    window.done = 'error: ' + e.message;
  }
};
img.src = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/6.png';
</script></body></html>`;

const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }
  try {
    const file = join(root, p.replace(/^\//, ''));
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((r) => server.listen(4175, r));

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGEERR:', err.message));
await page.goto('http://localhost:4175/');
await page.waitForFunction(() => window.done, null, { timeout: 30000 });
const done = await page.evaluate(() => window.done);
console.log('status:', done);

const results = await page.evaluate(() => window.results || []);
for (const r of results) {
  const b64 = r.data.split(',')[1];
  writeFileSync(join(root, `scripts/out-${r.id}.png`), Buffer.from(b64, 'base64'));
  console.log('saved:', r.id);
}

await browser.close();
server.close();

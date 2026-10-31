import { chromium } from 'playwright';
import path from 'path';
const root = path.resolve(process.argv[2]);
const jobs = [];
const frames = ['hero', 'login', 'home', 'campaigns'];
const sets = [['play', 1080, 1920], ['ios', 1290, 2796], ['ios', 1284, 2778]];
for (const [dir, w, h] of sets) frames.forEach((k, i) => jobs.push({ k, w, h, out: `${root}/${dir}/${String(i + 1).padStart(2, '0')}-${k}-${w}x${h}.png` }));
jobs.push({ k: 'feature', w: 1024, h: 500, out: `${root}/play/feature-graphic-1024x500.png` });
const b = await chromium.launch();
for (const j of jobs) {
  const p = await b.newPage({ viewport: { width: j.w, height: j.h } });
  await p.goto(`file:///${root}/_build/frame.html?k=${j.k}&w=${j.w}`);
  await p.waitForFunction(() => document.title === 'ready').catch(() => {});
  await p.waitForTimeout(600);
  await p.screenshot({ path: j.out });
  await p.close();
  console.log(j.out);
}
await b.close();

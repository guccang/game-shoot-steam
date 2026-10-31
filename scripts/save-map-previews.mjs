// 将本地 playwright-cli 导出日志落盘；记录依赖指纹，地图绘制源码变更后必须重新生成。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_PREVIEW_VERSION } from '../src/rendering/map-preview-cache.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const log = await readFile(resolve(process.argv[2] || 'output/playwright/map-open/generated.log'), 'utf8');
const payload = log.replace(/^\uFEFF/, '').split('### Result')[1]?.split('### Ran Playwright code')[0];
if (!payload) throw Error('导出日志没有完整结果，不能发布地图资源');
const images = JSON.parse(payload.trim());
const names = ['forest-spring', 'forest-summer', 'forest-autumn', 'forest-winter', 'jiuzhaigou-summer'];
if (images.length !== names.length || names.some(name => images.filter(i => i.name === name).length !== 1)) throw Error('地图变体不完整');
const target = resolve(root, 'assets/map-preview'); await mkdir(target, { recursive: true });
// 源文件及位图都使用同一哈希，验收时可定位过期资源或损坏文件。
function hash(data) { return createHash('sha256').update(data).digest('hex'); }
const sources = {};
// 递归收集正式总览绘制入口的本地依赖，不把生成脚本或用户存档当作图形输入。
async function collect(file) {
  const key = relative(root, file).replaceAll('\\', '/');
  if (sources[key]) return;
  const data = await readFile(file, 'utf8'); sources[key] = hash(data.replaceAll('\r\n', '\n'));
  for (const match of data.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))
    await collect(resolve(dirname(file), match[1]));
}
for (const entry of ['ground-art', 'scenery', 'natural-terrain', 'jiuzhaigou']) await collect(resolve(root, `src/rendering/${entry}.js`));
await collect(resolve(root, 'src/world/coordinates.js'));
const files = [];
for (const item of images) {
  const data = Buffer.from(item.png, 'base64'), file = `${item.name}.png`;
  if (data.readUInt32BE(16) !== 720 || data.readUInt32BE(20) !== 560) throw Error('导出尺寸错误');
  await writeFile(resolve(target, file), data); files.push({ file, bytes: data.length, sha256: hash(data) });
}
await writeFile(resolve(target, 'manifest.json'), JSON.stringify({ version: MAP_PREVIEW_VERSION, width: 720, height: 560,
  description: '正式总览绘制器生成的静态底图；动态文字、玩家和任务不在图内。', sources, files }, null, 2) + '\n');
console.log(JSON.stringify({ count: files.length, bytes: files.reduce((sum, f) => sum + f.bytes, 0), sources: Object.keys(sources).length }));

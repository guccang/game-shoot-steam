// 递归检查全部源码的语法、导入路径与依赖方向，新增模块自动纳入检查。
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as vm from 'node:vm';
const root = fileURLToPath(new URL('../src/', import.meta.url));
// 递归收集源码，避免手写文件列表遗漏后续新增模块。
async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((e) =>
      e.isDirectory()
        ? collect(resolve(dir, e.name))
        : /\.(js|json)$/.test(e.name)
          ? [resolve(dir, e.name)]
          : [],
    ),
  );
  return groups.flat();
}
const files = await collect(root),
  known = new Set(files),
  graph = new Map();
const allowed = {
  config: ['config'],
  world: ['world'],
  physics: ['physics', 'world'],
  combat: ['combat', 'physics', 'world', 'config'],
  progression: ['progression', 'config', 'core'],
  core: ['core', 'progression', 'config', 'world', 'physics', 'combat'],
  rendering: ['rendering', 'core', 'config', 'world', 'physics', 'combat'],
  platform: ['platform', 'progression', 'world'],
  ui: ['ui', 'platform', 'config', 'progression', 'world', 'rendering'],
  app: ['app', 'ui', 'platform', 'core', 'progression', 'world', 'rendering'],
  i18n: ['i18n'],
};
for (const file of files) {
  const source = await readFile(file, 'utf8'),
    name = relative(root, file).replaceAll('\\', '/'),
    layer = name.split('/')[0],
    edges = [];
  // JSON 语言表参与路径检查，但不作为 JavaScript 模块解析。
  if (file.endsWith('.json')) { JSON.parse(source); graph.set(file, edges); continue; }
  // 受限工作区使用 V8 模块解析器，不执行源码，也不需要创建子进程。
  if (typeof vm.SourceTextModule === 'function') {
    new vm.SourceTextModule(source, { identifier: file });
  } else {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.error) throw new Error(`${result.error.message}；请运行 node --experimental-vm-modules scripts/check.mjs 完成同等检查。`);
    if (result.status !== 0) throw new Error(result.stderr);
  }
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
    const target = resolve(dirname(file), match[1]);
    if (!known.has(target)) throw new Error(`导入不存在：${name} → ${match[1]}`);
    const targetName = relative(root, target).replaceAll('\\', '/'),
      targetLayer = targetName.split('/')[0];
    if (allowed[layer] && targetLayer !== 'i18n' && !allowed[layer].includes(targetLayer))
      throw new Error(`底层反向依赖：${name} → ${targetName}`);
    if (layer === 'progression' && targetLayer === 'core' && targetName !== 'core/math.js')
      throw new Error('成长数据不能依赖游戏实例');
    if (layer === 'rendering' && targetLayer === 'core' && targetName !== 'core/math.js')
      throw new Error('画布模块不能导入游戏实例');
    edges.push(target);
  }
  graph.set(file, edges);
}
const visited = new Set(),
  stack = new Set();
// 检查循环依赖，避免模块初始化顺序成为隐藏前提。
function visit(file) {
  if (stack.has(file)) throw new Error(`循环依赖：${relative(root, file)}`);
  if (visited.has(file)) return;
  stack.add(file);
  for (const next of graph.get(file)) visit(next);
  stack.delete(file);
  visited.add(file);
}
for (const file of files) visit(file);
console.log(`已检查 ${files.length} 个模块：语法、导入路径、分层和无循环依赖通过。`);

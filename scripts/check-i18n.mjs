// 国际化专用检查：验证语言表、插值参数、页面引用及运行代码中的遗漏中文。
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { parse as parseHTML } from 'parse5';
import { validateMessages, placeholders } from '../src/i18n/format.js';
import { auditJS, auditHTML, auditCSS } from './lib/i18n-visible-audit.mjs';
const root = new URL('../', import.meta.url);
const reference = JSON.parse(await readFile(new URL('src/i18n/locales/zh-CN.json', root), 'utf8'));
const settings = JSON.parse(await readFile(new URL('src/i18n/settings.json', root), 'utf8'));
const used = new Set(), han = /\p{Script=Han}/u;

// 递归收集源码，只扫描正式模块，不把测试断言和中文注释当成显示文案。
async function files(url) {
  const entries = await readdir(url, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(new URL(entry.name+'/',url)) : new URL(entry.name,url)))).flat();
}

// 每个引用都必须存在，动态调用必须提供本层插值参数。
function referenceKey(key, params, where) {
  if (!Object.hasOwn(reference, key)) throw Error(`Missing key: ${where}: ${key}`);
  used.add(key);
  const expected = placeholders(reference[key]).filter(name => /^p\d+$/.test(name));
  if (params && JSON.stringify([...params].sort()) !== JSON.stringify(expected)) throw Error(`Invalid parameters: ${where}: ${key}`);
}

// 语法树不匹配注释，防止未来将用户可见中文重新写回游戏逻辑。
function visitJS(node, file) {
  if (!node || typeof node !== 'object') return;
  if ((node.type === 'Literal' && typeof node.value === 'string' && han.test(node.value)) || (node.type === 'TemplateElement' && han.test(node.value.cooked || ''))) throw Error(`Inline Chinese: ${file}:${node.loc.start.line}`);
  if (node.type === 'CallExpression' && ['i18nText','i18nHtml'].includes(node.callee.name) && node.arguments[0]?.type === 'Literal') {
    const params = node.arguments[1]?.properties.map(p => p.key.name || p.key.value) || [];
    referenceKey(node.arguments[0].value, params, file+':'+node.loc.start.line);
  }
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(child => visitJS(child, file)); else if (value && typeof value === 'object') visitJS(value, file);
}

// 文本锚点及无障碍属性同样纳入校验，原有 HTML 注释不参与翻译。
function visitHTML(node, file) {
  if (node.nodeName === '#comment' && node.data.startsWith('i18n:')) referenceKey(node.data.slice(5), null, file);
  if (node.nodeName === '#text' && han.test(node.value)) throw Error(`Inline HTML Chinese: ${file}`);
  for (const attr of node.attrs || []) {
    if (attr.name.startsWith('data-i18n-')) referenceKey(attr.value, null, file);
    else if (han.test(attr.value)) throw Error(`Inline attribute Chinese: ${file}/${attr.name}`);
  }
  for (const child of node.childNodes || []) visitHTML(child, file);
  if (node.content) visitHTML(node.content, file);
}

if (!Object.hasOwn(settings.locales, settings.defaultLocale)) throw Error('Default locale is not registered');
for (const [locale, path] of Object.entries(settings.locales)) {
  if (!/^\.\/locales\/[A-Za-z0-9_-]+\.json$/.test(path)) throw Error(`Invalid locale path: ${locale}`);
  validateMessages(JSON.parse(await readFile(new URL(path, new URL('src/i18n/',root)), 'utf8')), reference, locale);
}
for (const file of await files(new URL('src/',root))) {
  if(!/\.(js|css)$/.test(file.pathname))continue;
  const source=await readFile(file,'utf8');
  if(file.pathname.endsWith('.js')){
    visitJS(parse(source, {ecmaVersion:'latest',sourceType:'module',locations:true}), fileURLToPath(file));
    const issues=auditJS(source);if(issues.length)throw Error(`Inline display text: ${fileURLToPath(file)}: ${JSON.stringify(issues)}`);
  }
  if(file.pathname.endsWith('.css')){const issues=auditCSS(source);if(issues.length)throw Error(`CSS display text: ${fileURLToPath(file)}: ${issues.join('; ')}`);}
}
for (const file of (await readdir(root)).filter(name => name.endsWith('.html'))) {
  const source=await readFile(new URL(file,root),'utf8');visitHTML(parseHTML(source), file);
  const issues=auditHTML(source);if(issues.length)throw Error(`HTML display text: ${file}: ${issues.join('; ')}`);
}
for (const key of Object.keys(reference)) if (!used.has(key)) throw Error(`Unused translation: ${key}`);
console.log(`国际化检查通过：${used.size} 条文案，${Object.keys(settings.locales).length} 个语言包；中文、直接显示文本、CSS、引用键和占位符检查通过。`);

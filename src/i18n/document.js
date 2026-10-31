// 静态页面使用注释定位原有文本节点，不增加会影响布局的包装元素。
import { i18nText, locale } from './index.js';
const initialized = new WeakSet();

// 每个文档只初始化一次，重复挂载应用时不覆盖已经更新的动态 HUD。
export function localizeDocument(root) {
  if (initialized.has(root)) return;
  const document = root.ownerDocument || root;
  document.documentElement.lang = locale;
  const walker = document.createTreeWalker(root, 128);
  const anchors = [];
  while (walker.nextNode()) if (walker.currentNode.data.startsWith('i18n:')) anchors.push(walker.currentNode);
  for (const anchor of anchors) anchor.after(document.createTextNode(i18nText(anchor.data.slice(5))));
  for (const element of root.querySelectorAll('*')) for (const attr of [...element.attributes]) {
    if (!attr.name.startsWith('data-i18n-')) continue;
    const name = attr.name.slice(10), text = i18nText(attr.value);
    if (name === 'text') element.textContent = text;
    else element.setAttribute(name, text);
  }
  initialized.add(root);
}

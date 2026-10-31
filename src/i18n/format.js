// 语言表基础校验与插值不依赖浏览器，供运行时和离线检查共用。
const slots = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

// 占位符允许调整顺序和重复使用，但不能删除或改名。
export function placeholders(message) {
  return [...new Set([...message.matchAll(slots)].map(match => match[1]))].sort();
}

// 完整语言包必须覆盖中文基准；缺项明确失败，避免混用语言掩盖漏翻。
export function validateMessages(messages, reference, locale) {
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) throw Error(`Invalid language table: ${locale}`);
  for (const [key, original] of Object.entries(reference)) {
    if (!Object.hasOwn(messages, key) || typeof messages[key] !== 'string' || !messages[key].trim()) throw Error(`Missing translation: ${locale}/${key}`);
    if (JSON.stringify(placeholders(messages[key])) !== JSON.stringify(placeholders(original))) throw Error(`Invalid placeholders: ${locale}/${key}`);
    if (/<\/?[a-z][^>]*>/i.test(messages[key])) throw Error(`HTML is not allowed in translations: ${locale}/${key}`);
  }
  for (const key of Object.keys(messages)) if (!Object.hasOwn(reference, key)) throw Error(`Unknown translation: ${locale}/${key}`);
  return messages;
}

// 仅替换本层 p0 等参数；剧情的命名参数继续交给已有剧情格式化器处理。
export function formatMessage(message, params = {}, transform = value => value) {
  let result = '', offset = 0;
  for (const match of message.matchAll(/\{(p\d+)\}/g)) {
    if (!Object.hasOwn(params, match[1])) throw Error(`Missing translation parameter: ${match[1]}`);
    result += transform(message.slice(offset, match.index)) + String(params[match[1]]);
    offset = match.index + match[0].length;
  }
  return result + transform(message.slice(offset));
}

// 译文作为 HTML 文本或属性时必须转义；既有调用点传入的界面片段维持原有结构。
export function escapeTranslation(value) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

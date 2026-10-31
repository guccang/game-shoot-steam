// 统一文案入口先加载选定语言，再让配置模块初始化，避免名称被缓存为默认语言。
import chinese from './locales/zh-CN.json' with { type: 'json' };
import settings from './settings.json' with { type: 'json' };
import { validateMessages, formatMessage, escapeTranslation } from './format.js';

// 页面与 Worker 优先读取 URL；宿主文档可通过属性指定语言。
export const locale = new URLSearchParams(globalThis.location?.search || '').get('lang') || globalThis.document?.documentElement?.dataset.locale || settings.defaultLocale;
if (!Object.hasOwn(settings.locales, locale)) throw Error(`Unknown locale: ${locale}`);
const file = settings.locales[locale];
if (typeof file !== 'string' || !/^\.\/locales\/[A-Za-z0-9_-]+\.json$/.test(file)) throw Error(`Invalid locale path: ${locale}`);
const messages = validateMessages(file === './locales/zh-CN.json' ? chinese : (await import(new URL(file, import.meta.url).href, { with: { type: 'json' } })).default, chinese, locale);

// 普通界面、配置和 Canvas 共用相同的稳定键；缺失键禁止静默回退。
export function i18nText(key, params) {
  if (!Object.hasOwn(messages, key)) throw Error(`Unknown translation key: ${key}`);
  return formatMessage(messages[key], params);
}

// HTML 标签仍由界面代码维护，仅对语言表中的文字进行转义。
export function i18nHtml(key, params) {
  if (!Object.hasOwn(messages, key)) throw Error(`Unknown translation key: ${key}`);
  return formatMessage(messages[key], params, escapeTranslation);
}

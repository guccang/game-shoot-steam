// 所有动态文本共用同一套 HTML 转义，保持普通值与可选文案的空值语义。
const ENTITIES=Object.freeze({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'});
// 普通值沿用 String 转换，零、布尔值和显式空值不会被误当作空字符串。
export function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>ENTITIES[c]);}
// 任务配置中的可选字段允许缺省，保持旧界面的空文案行为。
export function escapeOptionalHtml(value){return escapeHtml(value??'');}

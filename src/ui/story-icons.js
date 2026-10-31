// 故事与委托图标复用同一配色，纯标记不携带规则。
// 配置文字仅作为文本输出。
export const escapeStoryText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 类型使用稳定配置，书页、信封和礼物保持同一描边与尺寸。
export function storyTypeIcon(kind){
 const path=kind==='commission'?'<rect x="3" y="6" width="22" height="16" rx="3"/><path d="m4 8 10 8L24 8"/>':kind==='gift'?'<rect x="4" y="11" width="20" height="13" rx="2"/><path d="M3 8h22v5H3zM14 8v16M14 8C3 8 7 0 11 4l3 4c11 0 7-8 3-4z"/>':'<path d="M14 7C10 4 6 4 3 5v18c4-1 8-1 11 2 3-3 7-3 11-2V5c-4-1-8-1-11 2v18"/>';
 return `<svg viewBox="0 0 28 28" aria-hidden="true" fill="#F4DCA0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

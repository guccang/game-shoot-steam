// 随身物品与菜单共用64像素视框，独立剪影延续森林绿描边和有限平涂。
const drawings={
 bag:'<path fill="#d3b776" d="M23 17v-4c0-10 18-10 18 0v4M13 24c0-8 38-8 38 0v28c0 8-38 8-38 0Z"/><path fill="#e8edcf" d="M11 22c0-12 42-12 42 0v10c-10 10-32 10-42 0Z"/><rect x="26" y="29" width="12" height="16" rx="3" fill="#edbd63"/><path d="M20 49h24"/>',
 'elder-letter':'<path fill="#e8edcf" d="M7 17h50v34H7Z"/><path fill="#fff6dc" d="m7 17 25 22 25-22M7 51l18-19m32 19L39 32"/><circle cx="32" cy="36" r="6" fill="#edbd63"/>',
 'house-key':'<circle cx="23" cy="22" r="14" fill="#edbd63"/><circle cx="23" cy="22" r="5" fill="#fff6dc"/><path fill="#edbd63" d="m32 31 23 22-6 6-5-5-5 2-5-5 3-4-11-11"/><path fill="#e8edcf" d="M9 37h16v20H9Z"/><path d="M17 37V32"/>',
 'patrol-phone':'<rect x="15" y="5" width="34" height="54" rx="9" fill="#e8edcf"/><rect x="20" y="16" width="24" height="31" rx="3" fill="#fff6dc"/><path d="M28 11h8m-7 42h6"/><path fill="#edbd63" d="m32 22 8 18-8-4-8 4Z"/>',
};
// 仅接受固定图案身份，文字和无障碍名称由所在按钮提供。
export function keepsakeIcon(id){if(!drawings[id])throw Error('未知随身物品图案：'+id);return `<svg viewBox="0 0 64 64" fill="none" stroke="#315c43" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${drawings[id]}</svg>`;}

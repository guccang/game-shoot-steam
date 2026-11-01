// 四种实物弹药使用不同轮廓，购买页、背包与装备信息复用同一矢量图标。
const drawings={
 light:'<path fill="#d3b776" d="M11 27 19 11l8 16v29H11Zm26-5 8-15 8 15v34H37Z"/><path fill="#fff6dc" d="M11 27h16v6H11Zm26-5h16v6H37Z"/><path d="M11 49h16m10 0h16"/>',
 shell:'<path fill="#d3b776" d="M21 26h22v29H21Z"/><path fill="#8eab78" d="M21 26V20L32 6l11 14v6Z"/><path fill="#fff6dc" d="M21 31h22v6H21Z"/><path fill="#a78b53" d="M18 51h28v7H18Z"/><path d="M32 11v9"/>',
 heavy:'<path fill="#aebfb6" d="M15 26 20 18h24l5 8v29H15Z"/><path fill="#c98670" d="M20 18 25 6h14l5 12Z"/><path fill="#d3b776" d="M15 36h34v7H15Zm-3 14h40v8H12Z"/><path d="M23 28h18m-18 18h18"/>',
 water:'<path fill="#aebfb6" d="M24 7h16v9H24Z"/><rect x="13" y="16" width="38" height="42" rx="9" fill="#93bcb4"/><path fill="#fff6dc" d="M32 24c-3 6-9 10-9 16a9 9 0 0 0 18 0c0-6-6-10-9-16Z"/><path d="M27 7v9m10-9v9M19 51h26"/>',
};
// 未知弹药不伪装成通用子弹，图标名称由相邻可访问文本提供。
export function ammoIcon(key){return drawings[key]?`<svg data-ammo-icon="${key}" viewBox="0 0 64 64" fill="none" stroke="#315c43" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${drawings[key]}</svg>`:'';}

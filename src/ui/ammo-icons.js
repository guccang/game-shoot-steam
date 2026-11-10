import {SPECIAL_AMMO} from '../config/vehicle-special-ammo.js';
// 四种实物弹药使用不同轮廓，购买页、背包与装备信息复用同一矢量图标。
const drawings={
 waterbag:'<path fill="#93bcb4" d="M24 15h16l10 12 4 22-8 9H18l-8-9 4-22Z"/><path fill="#fff6dc" d="M23 6h18v11H23Z"/><path fill="#d8eee2" d="M32 24c-3 6-8 10-8 15a8 8 0 0 0 16 0c0-5-5-9-8-15Z"/><path d="m17 49 4 4h22l4-4M27 11h10"/>',
 light:'<path fill="#d3b776" d="M11 27 19 11l8 16v29H11Zm26-5 8-15 8 15v34H37Z"/><path fill="#fff6dc" d="M11 27h16v6H11Zm26-5h16v6H37Z"/><path d="M11 49h16m10 0h16"/>',
 shell:'<path fill="#d3b776" d="M21 26h22v29H21Z"/><path fill="#8eab78" d="M21 26V20L32 6l11 14v6Z"/><path fill="#fff6dc" d="M21 31h22v6H21Z"/><path fill="#a78b53" d="M18 51h28v7H18Z"/><path d="M32 11v9"/>',
 heavy:'<path fill="#aebfb6" d="M15 26 20 18h24l5 8v29H15Z"/><path fill="#c98670" d="M20 18 25 6h14l5 12Z"/><path fill="#d3b776" d="M15 36h34v7H15Zm-3 14h40v8H12Z"/><path d="M23 28h18m-18 18h18"/>',
 water:'<path fill="#aebfb6" d="M24 7h16v9H24Z"/><rect x="13" y="16" width="38" height="42" rx="9" fill="#93bcb4"/><path fill="#fff6dc" d="M32 24c-3 6-9 10-9 16a9 9 0 0 0 18 0c0-6-6-10-9-16Z"/><path d="M27 7v9m10-9v9M19 51h26"/>',
};
// 未知弹药不伪装成通用子弹，图标名称由相邻可访问文本提供。
// 元素徽记在相同弹壳上保留不同结构，低饱和场景也可按轮廓辨识。
const marks={he:'M26 27L32 20L34 28L40 30L34 34L32 41L29 34L23 31Z',frost:'M32 22V40M24 26L40 36M24 36L40 26',flame:'M26 39Q22 31 32 21Q32 29 37 26Q44 39 26 39Z',gas:'M24 35Q19 27 27 26Q33 17 38 28Q47 30 40 37Z',arcShell:'M35 21L26 32H34L28 42L40 28H32Z',seismic:'M22 27L28 34L32 27L37 35L42 27',flare:'M23 28Q32 13 41 28L32 38Z'};
export function ammoIcon(key){if(SPECIAL_AMMO[key])return `<svg data-ammo-icon="${key}" viewBox="0 0 64 64" aria-hidden="true"><path d="M24 16L32 6L40 16V49H24Z" fill="${SPECIAL_AMMO[key].color}" stroke="#315c43" stroke-width="3"/><path d="M22 50H42V57H22Z" fill="#e8d5a0" stroke="#315c43" stroke-width="3"/><path d="${marks[key]}" fill="none" stroke="#315c43" stroke-width="2"/></svg>`;return drawings[key]?`<svg data-ammo-icon="${key}" viewBox="0 0 64 64" fill="none" stroke="#315c43" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${drawings[key]}</svg>`:'';}

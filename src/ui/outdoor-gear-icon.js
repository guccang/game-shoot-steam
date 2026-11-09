// 户外用品的货架、详情和购物车共用同一组矢量小图。
import {inventoryIcon} from './inventory-icons.js';
import {fishStorageIcon} from './fish-storage-icon.js';

const rodFinishes=['#d1ac73','#97b783','#af8259','#9cbec2','#d5b369'];
const baitMarks={
 bait:'<g fill="#dda64f"><ellipse cx="26" cy="37" rx="4" ry="6"/><ellipse cx="37" cy="40" rx="4" ry="6"/></g>',
 worm:'<path stroke="#ae715a" stroke-width="5" d="M19 43q5-18 13-5t13-7"/>',
 insect:'<g fill="#8fa96b"><ellipse cx="32" cy="39" rx="6" ry="9"/><path d="m24 34-4-3m5 8-6 2m20-7 5-3m-5 8 6 2M32 34v13"/></g>',
 shrimp:'<path fill="#d79878" d="M19 37q9-13 22-3 9 12-9 13l-4-4q13 0 9-6-6-4-13 4l-7 1Z"/>',
 algae:'<path fill="#8fb180" d="M32 49q-17-7-13-17 7 2 12 11-6-16 0-18 5 7 4 17 5-11 12-11-1 11-15 18Z"/>',
 glow:'<path fill="#e7d7a1" d="M29 36h7l2 11H27Z"/><path fill="#9eb7bd" d="M19 37q1-6 9-11 8-4 16 9-9 5-25 2Z"/>'
};

// 竿梢、轮座与饵盒保持同系列轮廓，局部材料纹样识别具体型号。
export function outdoorGearIcon(g){
 if(g.kind==='fish-container')return fishStorageIcon(g.tackleId);
 if(g.kind==='tent')return inventoryIcon({icon:{kind:'tent'}});
 const rod=g.kind==='rod';
 const art=rod?`<path d="M10 54Q25 30 42 10q8-4 11 3l1 27" stroke-width="1.8"/><path d="M11 53 37 17" stroke="${rodFinishes[g.tier-1]}" stroke-width="5"/><path d="m9 55 9-13" stroke-width="6"/><circle cx="23" cy="42" r="6" fill="${rodFinishes[g.tier-1]}"/><circle cx="23" cy="42" r="2"/><path fill="#c87e62" d="m54 36 3 6-3 5-3-5Z"/>`:
 `<rect x="11" y="19" width="42" height="35" rx="7" fill="#ead5a4"/><rect x="10" y="14" width="44" height="9" rx="4" fill="#91a785"/>${baitMarks[g.tackleId]}`;
 return `<svg viewBox="0 0 64 64" fill="none" stroke="#315c43" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${art}</svg>`;
}

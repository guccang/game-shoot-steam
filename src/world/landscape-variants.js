import { i18nText } from "../i18n/index.js";
// 自然景观目录：四类形态各六种，几何与组合规则独立于绘制器和战斗状态。
export const MOUNTAIN_VARIANTS = [
  { id: 'mesa', name: i18nText("world.landscape-variants.a7143e4af1") }, { id: 'twins', name: i18nText("world.landscape-variants.7f24b5aac6") },
  { id: 'needles', name: i18nText("world.landscape-variants.4b5d8bd563") }, { id: 'terraces', name: i18nText("world.landscape-variants.710e134714") },
  { id: 'ridge', name: i18nText("world.landscape-variants.3ca4c65efe") }, { id: 'crown', name: i18nText("world.landscape-variants.c63966c8a9") },
];
export const LAKE_VARIANTS = [
  { id: 'bean', name: i18nText("world.landscape-variants.f60f400710") }, { id: 'crescent', name: i18nText("world.landscape-variants.36d03e0270") },
  { id: 'ribbon', name: i18nText("world.landscape-variants.cbaa647330") }, { id: 'clover', name: i18nText("world.landscape-variants.4b4c5616d5") },
  { id: 'pear', name: i18nText("world.landscape-variants.83bcb9aa28") }, { id: 'diamond', name: i18nText("world.landscape-variants.606eead162") },
];
export const BEACH_VARIANTS = [
  { id: 'crescent', name: i18nText("world.landscape-variants.b26e8b6871"), sand: '#ebd09a' },
  { id: 'twin', name: i18nText("world.landscape-variants.56dacad578"), sand: '#ead3a6' },
  { id: 'spit', name: i18nText("world.landscape-variants.fc7b6873fc"), sand: '#edd9af' },
  { id: 'fan', name: i18nText("world.landscape-variants.e95fa9e796"), sand: '#e9c990' },
  { id: 'scallop', name: i18nText("world.landscape-variants.0b7cbab5b0"), sand: '#e6d4b2' },
  { id: 'dunes', name: i18nText("world.landscape-variants.cd0bf494fb"), sand: '#e6c589' },
];
export const FOREST_VARIANTS = [
  { id: 'round', name: i18nText("ui.panels.map.8916f82881"), palette: 0, spread: 1, spacing: 64 },
  { id: 'pine', name: i18nText("world.landscape-variants.9bc646e8b1"), palette: 1, spread: .9, spacing: 59 },
  { id: 'birch', name: i18nText("world.landscape-variants.24ecbc7c56"), palette: 0, spread: 1.12, spacing: 70 },
  { id: 'willow', name: i18nText("world.landscape-variants.c2b4b5b4fe"), palette: 0, spread: 1.18, spacing: 86 },
  { id: 'maple', name: i18nText("world.landscape-variants.fbf200fccc"), palette: 2, spread: 1.04, spacing: 72 },
  { id: 'cypress', name: i18nText("world.landscape-variants.3b1b80ef4e"), palette: 3, spread: .84, spacing: 62 },
];

// 六个安全样区保持山后湖前或山侧湖湾，外围草地相接，中间留下可走的干地。
export const LANDSCAPE_GROUPS = [
  { id:'glade', lake:{x:1700,y:1110,rx:170,ry:118}, mountain:{x:2130,y:1030,rx:90,ry:36,height:165} },
  { id:'valley', lake:{x:2110,y:1900,rx:160,ry:115}, mountain:{x:2130,y:1590,rx:82,ry:35,height:110} },
  { id:'highland', lake:{x:3090,y:1220,rx:170,ry:105}, mountain:{x:3065,y:990,rx:94,ry:34,height:120} },
  { id:'grove', lake:{x:3080,y:2090,rx:168,ry:112}, mountain:{x:3080,y:1800,rx:108,ry:42,height:165} },
  { id:'marsh', lake:{x:1750,y:2440,rx:163,ry:118}, mountain:{x:2130,y:2440,rx:104,ry:38,height:125} },
  // 南庭院与湖湾之间改为低岩丘，山顶不压住高塔，湖泊轮廓保持不变。
  { id:'spring', lake:{x:615,y:1715,rx:82,ry:94}, mountain:{x:620,y:1560,rx:86,ry:32,height:65} },
];

// 未指定搭配时，每类种子洗牌一次，保证六个样区覆盖全部形态；显式搭配允许任意重复。
export function landscapeRecipes(seed, count, combinations) {
  const catalogs={mountain:MOUNTAIN_VARIANTS,lake:LAKE_VARIANTS,beach:BEACH_VARIANTS,forest:FOREST_VARIANTS};
  if(combinations && (!Array.isArray(combinations)||!combinations.length))throw new TypeError(i18nText("world.landscape-variants.4e3c993a73"));
  let state=seed>>>0;
  // 此随机流只用于目录洗牌，新增摆件不会改变已有地貌搭配。
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const orders={};
  for(const [kind,catalog] of Object.entries(catalogs)) {
    orders[kind]=catalog.map(v=>v.id);
    for(let i=orders[kind].length-1;i>0;i--) {
      const j=Math.floor(random()*(i+1));[orders[kind][i],orders[kind][j]]=[orders[kind][j],orders[kind][i]];
    }
  }
  return Array.from({length:count},(_,i)=>{
    const recipe={};
    for(const [kind,catalog] of Object.entries(catalogs)) {
      const value=combinations?.[i%combinations.length]?.[kind]??orders[kind][i%6];
      if(!catalog.some(v=>v.id===value))throw new TypeError(i18nText("world.landscape-variants.53f6120f6a", { p0: (kind), p1: (value) }));
      recipe[kind]=value;
    }
    return recipe;
  });
}

// 星形采样始终按角度顺序围成单一水面，深凹湾仍使用同一多边形进行碰撞与绘制。
export function lakeContour(rx,ry,phase,variant,count=64) {
  return Array.from({length:count},(_,i)=>{
    const a=i/count*Math.PI*2, ca=Math.cos(a),sa=Math.sin(a);
    let r=1,x=ca,y=sa;
    if(variant==='bean') {r=1+.18*Math.sin(a*2)-.22*Math.max(0,-ca)**4;x*=1.03;}
    else if(variant==='crescent') {r=1-.65*Math.max(0,ca)**6+.1*Math.sin(a*2);y*=1.08;}
    else if(variant==='ribbon') {x*=1.13;y*=.63;r=1+.13*Math.sin(a*3);y+=.19*Math.sin(ca*3);}
    else if(variant==='clover') r=.9+.23*Math.cos(a*3+.3);
    else if(variant==='pear') {r=.84+.26*sa;x*=1.08;}
    else if(variant==='diamond') {
      r=.99/(Math.abs(ca)**1.38+Math.abs(sa)**1.38)**(1/1.38);
      r*=1+.14*Math.sin(a*3+.5)+.06*Math.cos(a*5);x+=.12*sa;
    }
    r*=1+.035*Math.sin(a*5+phase);
    return {x:x*rx*r,y:y*ry*r};
  });
}

// 六种岸带有不同的宽窄节奏和开口，统一保留薄岸与大片单侧干沙。
export function beachLobe(angle,variant) {
  const lobe=(offset,power)=>Math.max(0,Math.cos(angle-offset))**power;
  if(variant==='twin')return Math.max(lobe(-.63,10),lobe(.63,10)*.88);
  if(variant==='spit')return lobe(.13,13)*1.36;
  if(variant==='fan')return lobe(-.18,1.25);
  if(variant==='scallop')return lobe(0,2)*(.78+.22*Math.cos(angle*9));
  if(variant==='dunes')return Math.max(lobe(-.3,3),lobe(.6,7)*.76);
  return lobe(0,3);
}

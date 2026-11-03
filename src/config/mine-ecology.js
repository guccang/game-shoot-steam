// 地下生态目录和层级面积规则，稳定种子只在开通时生成一次。
import {WORLD} from '../world/coordinates.js';
import {MINING,minePoint} from './mining.js';
export const MINE_BIOMES=[
 {id:'mushroom',name:'荧菇林',floor:'#aaa982',night:'#76856c',resource:'wood',yield:3,regrow:90,animal:'spore'},
 {id:'roots',name:'地下根木林',floor:'#b6a37c',night:'#887c61',resource:'wood',yield:5,regrow:120,animal:'beetle'},
 {id:'crystal',name:'晶簇花园',floor:'#acc3ad',night:'#708f84',resource:'ore',yield:4,regrow:120,animal:'bat'},
 {id:'moss',name:'苔藓草甸',floor:'#a5b986',night:'#728c67',resource:'heal',yield:12,regrow:60,animal:'spore'},
 {id:'stalagmite',name:'钟乳石厅',floor:'#c1baa0',night:'#8c9685',resource:'ore',yield:6,regrow:180,animal:'bat'},
 {id:'river',name:'地下暗河',floor:'#b9ba96',night:'#7c9481',resource:null,animal:'bat'},
 {id:'lake',name:'蓝萤湖',floor:'#abbca1',night:'#728f85',resource:null,animal:'bat'},
 {id:'spring',name:'地热温泉',floor:'#c7baa0',night:'#968e7f',resource:'heal',yield:16,regrow:80,animal:'beetle'},
 {id:'fossil',name:'化石遗迹',floor:'#c6b48c',night:'#938970',resource:'ore',yield:3,regrow:150,animal:'beetle'},
];
export const MINE_ANIMALS={beetle:{name:'岩甲虫',hp:48,speed:38,damage:8,range:32,windup:.65,recover:1.1,reward:3},bat:{name:'洞穴蝠',hp:30,speed:60,damage:6,range:36,windup:.65,recover:1,reward:2},spore:{name:'菌伞怪',hp:60,speed:25,damage:10,range:150,windup:1,recover:1.5,reward:4}};
// 景观石柱耐久与矿镐伤害独立于普通岩壁，矿石产量与恢复时间读取生态配置。
export const MINE_ROCK={hp:60,pickDamage:20,pickReach:72};
export const MINE_ECOLOGY={unlockRatio:.5,bridge:{ore:2,wood:4},respawn:180,scanRadius:8,maxNearby:10};
// 无状态坐标散列使景观、栖地和轮廓在读档后保持原布局。
export function mineHash(x,y,seed=1847){let n=(Math.imul(x,374761393)^Math.imul(y,668265263)^seed)>>>0;n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;}
// 地下不设层数上限；第三层起均按10%至100%生成，矩形包含入口且只在首次开通时随机。
export function createMineGeography(depth,entry=MINING.home,random=Math.random){
 const seed=Math.floor(random()*2147483646)+1,coverage=depth===1?100:depth===2?10+Math.floor(random()*41):10+Math.floor(random()*91),scale=Math.sqrt(coverage/100),width=WORLD.width*scale,height=WORLD.height*scale;
 const left=Math.max(0,Math.min(WORLD.width-width,entry.x-width*(.25+random()*.5))),top=Math.max(0,Math.min(WORLD.height-height,entry.y-height*(.25+random()*.5)));
 return {seed,coverage,bounds:{left,top,right:left+width,bottom:top+height}};
}
// 已保存层缺少边界只按旧版地下一层迁移，不重新随机旧档。
export function mineBounds(layer){return layer?.bounds||{left:0,top:0,right:WORLD.width,bottom:WORLD.height};}
// 实际层范围是不可挖掘岩层的内沿；施工格心和移动采样共用此判定。
export function mineInsideBounds(layer,x,y){const b=mineBounds(layer);return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;}
// 边界格只计算与真实地图相交的面积，使100%一层与随机百分比精确成立。
export function mineCellArea(cell,layer){const p=minePoint(cell),b=mineBounds(layer),half=MINING.tile/2;return Math.max(0,Math.min(p.x+half,b.right)-Math.max(p.x-half,b.left))*Math.max(0,Math.min(p.y+half,b.bottom)-Math.max(p.y-half,b.top));}
// 根据固定地理种子生成相邻成片生态，边界轻微起伏，入口九格始终干燥。
export function mineTerrain(cell,layer){
 const seed=layer?.seed||1847,entry=layer?.entry||'0,0',[ex,ey]=entry.split(',').map(Number),safe=Math.abs(cell.x-ex)<=1&&Math.abs(cell.y-ey)<=1;
 const wx=cell.x+Math.sin(cell.y*.32+(seed%11))*.8,wy=cell.y+Math.sin(cell.x*.27+(seed%7))*.8,cx=Math.floor((wx+3)/7),cy=Math.floor((wy+3)/7),index=((cx+cy*3+seed)%9+9)%9,biome=MINE_BIOMES[index],hash=mineHash(cell.x,cell.y,seed),lx=wx-(cx*7+.5),ly=wy-(cy*7+.5);
 const water=!safe&&(biome.id==='river'?Math.abs(lx-Math.sin(wy*.65)*.8)<1:biome.id==='lake'?((lx+.6)**2/6+(ly-.5)**2/3.5)<1:biome.id==='spring'?lx*lx+ly*ly<1.8:false);
 // 洞厅在开层时由稳定种子决定，水域与岸边天然露出，不依赖已开掘记录。
 const chamber=(lx*lx/(3.1+Math.sin(cy+seed)*.35)**2+ly*ly/(2.7+Math.cos(cx+seed)*.4)**2)<1;
 const natural=safe||water||chamber;
 return {biome,region:cx+','+cy,water,natural,prop:natural&&!safe&&!water&&(hash>>>8)%5===0,hash,safe};
}

// 天然洞厅与玩家挖通区域共用开放判定，边界外始终不可通行或施工。
export function mineCellOpen(cell,layer){return mineCellArea(cell,layer)>0&&(!!layer.dug?.[`${cell.x},${cell.y}`]||mineTerrain(cell,layer).natural);}

// 怪物只按层数温和成长，第九层封顶；不读取玩家装备等级。
export function mineAnimalStats(kind,depth=1){
 const base=MINE_ANIMALS[kind],step=Math.min(8,Math.max(0,(depth||1)-1));
 return {...base,hp:Math.round(base.hp*(1+step*.12)),damage:Math.round(base.damage*(1+step*.08)),speed:base.speed*(1+step*.025)};
}
// 前两层最多两只同时追击，第三至五层三只，更深四只，保留躲避空间。
export function mineThreatLimit(depth=1){return depth<=2?2:depth<=5?3:4;}

// 地下生态目录和层级面积规则，稳定种子只在开通时生成一次。
import {WORLD} from '../world/coordinates.js';
import {MINING,minePoint} from './mining.js';
export const MINE_BIOMES=[
 {id:'mushroom',name:'荧菇林',floor:'#aaa982',night:'#76856c',resource:'wood',yield:3,regrow:90,animal:'spore'},
 {id:'roots',name:'地下根木林',floor:'#b6a37c',night:'#887c61',resource:'wood',yield:5,regrow:120,animal:'beetle'},
 {id:'crystal',name:'晶簇花园',floor:'#acc3ad',night:'#708f84',resource:'ore',yield:4,regrow:120,animal:'bat'},
 {id:'moss',name:'苔藓草甸',floor:'#a5b986',night:'#728c67',resource:'heal',yield:12,regrow:60,animal:'spore'},
 {id:'stalagmite',name:'钟乳石厅',floor:'#c1baa0',night:'#8c9685',resource:null,animal:'bat'},
 {id:'river',name:'地下暗河',floor:'#b9ba96',night:'#7c9481',resource:null,animal:'bat'},
 {id:'lake',name:'蓝萤湖',floor:'#abbca1',night:'#728f85',resource:null,animal:'bat'},
 {id:'spring',name:'地热温泉',floor:'#c7baa0',night:'#968e7f',resource:'heal',yield:16,regrow:80,animal:'beetle'},
 {id:'fossil',name:'化石遗迹',floor:'#c6b48c',night:'#938970',resource:'ore',yield:3,regrow:150,animal:'beetle'},
];
export const MINE_ANIMALS={beetle:{name:'岩甲虫',hp:56,speed:38,damage:8,range:32,windup:.65,recover:1.1,reward:3},bat:{name:'洞穴蝠',hp:34,speed:60,damage:6,range:36,windup:.45,recover:1,reward:2},spore:{name:'菌伞怪',hp:70,speed:25,damage:10,range:150,windup:1,recover:1.5,reward:4}};
export const MINE_ECOLOGY={maxDepth:3,unlockRatio:.5,bridge:{ore:2,wood:4},respawn:180,scanRadius:8,maxNearby:10};
// 无状态坐标散列使景观、栖地和轮廓在读档后保持原布局。
export function mineHash(x,y,seed=1847){let n=(Math.imul(x,374761393)^Math.imul(y,668265263)^seed)>>>0;n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;}
// 面积按世界单位精确计算，随机矩形始终包含新层入口，禁止开层后再随机。
export function createMineGeography(depth,entry=MINING.home,random=Math.random){
 const seed=Math.floor(random()*2147483646)+1,coverage=depth===1?100:depth===2?10+Math.floor(random()*41):10+Math.floor(random()*91),scale=Math.sqrt(coverage/100),width=WORLD.width*scale,height=WORLD.height*scale;
 const left=Math.max(0,Math.min(WORLD.width-width,entry.x-width*(.25+random()*.5))),top=Math.max(0,Math.min(WORLD.height-height,entry.y-height*(.25+random()*.5)));
 return {seed,coverage,bounds:{left,top,right:left+width,bottom:top+height}};
}
// 已保存层缺少边界只按旧版地下一层迁移，不重新随机旧档。
export function mineBounds(layer){return layer?.bounds||{left:0,top:0,right:WORLD.width,bottom:WORLD.height};}
// 边界格只计算与真实地图相交的面积，使100%一层与随机百分比精确成立。
export function mineCellArea(cell,layer){const p=minePoint(cell),b=mineBounds(layer),half=MINING.tile/2;return Math.max(0,Math.min(p.x+half,b.right)-Math.max(p.x-half,b.left))*Math.max(0,Math.min(p.y+half,b.bottom)-Math.max(p.y-half,b.top));}
// 根据固定地理种子生成相邻成片生态，边界轻微起伏，入口九格始终干燥。
export function mineTerrain(cell,layer){
 const seed=layer?.seed||1847,entry=layer?.entry||'0,0',[ex,ey]=entry.split(',').map(Number),safe=Math.abs(cell.x-ex)<=1&&Math.abs(cell.y-ey)<=1;
 const wx=cell.x+Math.sin(cell.y*.32+(seed%11))*.8,wy=cell.y+Math.sin(cell.x*.27+(seed%7))*.8,cx=Math.floor((wx+3)/7),cy=Math.floor((wy+3)/7),index=((cx+cy*3+seed)%9+9)%9,biome=MINE_BIOMES[index],hash=mineHash(cell.x,cell.y,seed),lx=wx-(cx*7+.5),ly=wy-(cy*7+.5);
 const water=!safe&&(biome.id==='river'?Math.abs(lx-Math.sin(wy*.65)*.8)<1:biome.id==='lake'?((lx+.6)**2/6+(ly-.5)**2/3.5)<1:biome.id==='spring'?lx*lx+ly*ly<1.8:false);
 return {biome,water,prop:!safe&&!water&&hash%4===0,hash,safe};
}

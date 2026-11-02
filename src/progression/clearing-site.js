// 清缴地点只保存坐标与接取位置；导航、战斗及存档统一读取本次场地。
import {BOSS_CLEARING} from '../config/settlements.js';
import {CLEARING_SITE_RULES,CLEARING_STARTER_RULES,CLEARING_NAVIGATION} from '../config/clearing.js';
import {biomeAt} from '../world/biomes.js';
import {WORLD,worldDistance,wrap} from '../world/coordinates.js';
// 仅接受地图内的有限坐标，拒绝损坏或跨地图存档。
export function validWorldPosition(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<WORLD.width&&p.y>=0&&p.y<WORLD.height;}
// 重新构造固定身份与范围，存档不能扩大作战半径或覆盖显示文案。
export function normalizeClearingSite(raw){
 if(!validWorldPosition(raw)||!validWorldPosition(raw.origin))return null;
 const distance=worldDistance(raw,raw.origin),r=CLEARING_SITE_RULES;
 // 兼容首轮草甸近点与历史远点，不迁移已接取地点或重置波次。
 const beginnerSite=distance>=CLEARING_STARTER_RULES.minDistance&&distance<=CLEARING_STARTER_RULES.maxDistance&&biomeAt(raw.x,raw.y).id===CLEARING_STARTER_RULES.biome;
 if(!beginnerSite&&(distance<r.minDistance||distance>r.maxDistance))return null;
 return {id:'patrol-clearing',name:'本次清缴地点',mapId:'forest',x:raw.x,y:raw.y,radius:r.radius,origin:{x:raw.origin.x,y:raw.origin.y}};
}
// 未携带新地点的历史在途任务继续原东林场地；新接单必须由选点事务填入坐标。
export function clearingSite(progress){return progress.living?.clearingSite||BOSS_CLEARING;}
// 新旧清缴身份均交给任务导航，避免手动意图残留在已完成的旧位置。
export function isClearingSite(site){return ['patrol-clearing',BOSS_CLEARING.id].includes(site?.id);}

// 站牌本体位于场地中心，寻路终点放到牌前；不改写存档中的战斗中心和半径。
export function clearingNavigationSite(progress){const site=clearingSite(progress);return {...site,name:'清缴场站牌前',y:wrap(site.y+CLEARING_NAVIGATION.offsetY,WORLD.height),arrivalRadius:CLEARING_NAVIGATION.arrivalRadius};}

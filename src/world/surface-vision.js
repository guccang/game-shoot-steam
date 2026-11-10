// 地面迷雾的可见性与射程共用规则，不访问渲染器或扫描世界实体。
import {SURFACE_VISION} from '../config/surface-vision.js';
import {LIGHT_FIXTURES} from './lighting.js';
import {nearest} from './coordinates.js';

// 室内、地下、秘境和独立靶场沿用自身规则，昼夜权重由正式环境时钟提供。
export function surfaceNightStrength(game){
 if(game.cottage||game.realm||game.summonView||game.balconyScene||game.trees?.mineScene)return 0;
 return Math.max(0,Math.min(1,Number(game.surfaceNight)||0));
}

// 远程射程逐渐缩短，近战实体尺寸与控制器部署距离不变；不修改装备存档。
export function surfaceAttackRange(game,range){
 const night=surfaceNightStrength(game);
 return range+(Math.min(range*SURFACE_VISION.rangeRatio,SURFACE_VISION.rangeLimit)-range)*night;
}

// 重复经过手持、车载和独立炮口时只应用一次夜间系数，白昼恢复原参数。
export function surfaceWeapon(game,weapon){
 if(!weapon||weapon.attackKind==='melee'||weapon.controller||!Number.isFinite(weapon.range))return weapon;
 const base=weapon.surfaceBaseRange??weapon.range,range=surfaceAttackRange(game,base);
 return range===weapon.range?weapon:{...weapon,surfaceBaseRange:base,range};
}

// 猫猫身体与灯光的锚点一致；大体型目标露出轮廓即可发现，接缝使用最近镜像。
export function surfaceTargetVisible(game,target){
 const night=surfaceNightStrength(game);if(night<=.001)return true;
 const origin=game.summonViewOrigin||game.player,p=nearest(target,origin),y=p.y-(target.z||0)-20;
 // 淡雾初起时保留远景，随夜色收拢到固定光圈，避免切时段瞬间失去目标。
 const bodyRadius=Math.max(0,Number(target.radius)||0);
 const radius=SURFACE_VISION.player*SURFACE_VISION.litRatio/Math.max(.001,night)+bodyRadius;
 if(Math.hypot(p.x-origin.x,y-(origin.y-20))<=radius)return true;
 return game.mapId!=='jiuzhaigou'&&LIGHT_FIXTURES.some(light=>{const l=nearest(light,origin);return Math.hypot(p.x-l.x-light.offset,y-(l.y-light.height))<=light.radius*SURFACE_VISION.litRatio+bodyRadius;});
}

// 正式视口已经裁剪路灯，最多十六个光池，不查询全地图树木与营地。
export function surfaceLightSources(player,lights){
 return [{x:player.x,y:player.y-20,radius:SURFACE_VISION.player,kind:'player'},...lights.slice(0,SURFACE_VISION.maxLights-1).map(p=>({x:p.x+p.offset,y:p.y-p.height,radius:p.radius,kind:p.kind}))];
}

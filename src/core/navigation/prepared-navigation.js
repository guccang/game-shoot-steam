import {legendaryVisible} from '../workshop/legendary-workshop.js';
// 接单事务成功后暂存已验证的路线，只在当前游戏会话内消费一次，不写入存档。
import {worldDistance} from '../../world/coordinates.js';
import {SpatialGrid} from '../../world/spatial-grid.js';
const prepared=new WeakMap();
// 开始规划时复制树木碰撞快照；后续生长、砍伐和原对象血量变化都不改变本次搜索。
export function createPlayerNavigationIndex(trees){return new SpatialGrid(trees.filter(t=>t.hp>0).map(t=>({x:t.x,y:t.y,radius:t.radius,hp:t.hp})));}
// 导航读取当前通行能力，不修改角色、载具和召唤物的真实移动碰撞。
export function playerNavigationBody(game){return {...game.player,fenceVehicle:game.vehicle,planningRoute:true,campProgress:game.progress,mapId:game.mapId,legendaryBuilding:legendaryVisible(game),livingCollision:!game.story};}

// 通行条件变化必须重新验证，停车车体与维修护栏也属于正式障碍。
export function navigationBodyKey(body,{parking=true}={}){
 return JSON.stringify([body.campProgress?.campLand,body.campProgress?.campManagement?.items,body.campProgress?.campLayout,body.campProgress?.restoration?.repaired,body.mapId,body.fenceVehicle?.active?body.fenceVehicle.index:null,!!body.flying,!!body.amphibious,!!body.treePass,!!body.livingCollision,!!body.legendaryBuilding,body.navigationRadius??12,body.arena??null,body.worldBarriers??[],parking?body.parkingBarriers??[]:null]);
}

// 只记录成功事务的路线与树木快照；接单后树木变化不使已验证的路线失效。
export function rememberPreparedNavigation(game,goal,route,index,body){
 prepared.set(game,{goal:{x:goal.x,y:goal.y},route,index,bodyKey:navigationBodyKey(body),player:game.player,time:game.time});
}

// 目标、角色、地图或永久通行条件变化时丢弃预计算结果；树木不使预计算失效。
export function takePreparedNavigation(game,goal,body){
 const entry=prepared.get(game);prepared.delete(game);
 return entry&&entry.player===game.player&&entry.time<=game.time&&entry.bodyKey===navigationBodyKey(body)&&worldDistance(entry.goal,goal)<.001?entry:null;
}

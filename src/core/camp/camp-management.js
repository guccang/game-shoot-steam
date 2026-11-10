import {campFestival} from '../../config/camp-festivals.js';
// 购买、外观与摆放使用候选存档事务，保存失败时保持金币、世界和实例号不变。
import {CAMP_DECOR_CATALOG,CAMP_DECOR_LIMIT,CAMP_DECOR_GRID,campStyle} from '../../config/camp-management.js';
import {normalizeCampManagement} from '../../progression/camp/camp-management.js';
import {campDecorPlacementError} from '../../world/camp-decor.js';
import {canInspectBuilding} from './building-entry.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 管理允许在暂停面板操作，战斗、剧情和室内不改世界。
export function canManageCamp(game){return canInspectBuilding(game)&&['playing','paused'].includes(game.state)&&!game.arrivalPending;}
// 所有操作共用先存后兑现，真实巡林位置一并捕获。
function commit(game,change){if(!canManageCamp(game))return {ok:false,message:'请在地面巡林时管理营地，先结束当前活动。'};const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));next.campManagement=normalizeCampManagement(next.campManagement);const message=change(next);if(message)return {ok:false,message};const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);try{if(game.livingPersist?.(next)!==true)return {ok:false,message:'未能保存，请重试；金币和营地未改变。'};}catch{return {ok:false,message:'未能保存，请重试；金币和营地未改变。'};}game.progress=next;game.player.campProgress=next;game.onEvent?.('camp-management-change');return {ok:true,message:'已保存。'};}
// 每个材质与造型组合只购买一次，已拥有时免费换用。
export function applyCampStyle(game,category,material,shape){return commit(game,p=>{const s=campStyle(category,material,shape);if(!s)return '没有这种外观。';if(!p.campManagement.owned.includes(s.key)){if(p.coins<s.price)return '金币不足。';p.coins-=s.price;p.campManagement.owned.push(s.key);}p.campManagement.styles[category]={material,shape};return '';});}
// 连续购买得到不同实例，避免摆放时覆盖同类摆件。
export function buyCampDecor(game,type){let uid;const result=commit(game,p=>{const d=CAMP_DECOR_CATALOG.find(d=>d.id===type);if(!d)return '没有这件装饰。';if(p.campManagement.items.length>=CAMP_DECOR_LIMIT)return '装饰收纳已满（60件）。';if(p.coins<d.price)return '金币不足。';if(p.campManagement.nextId>=Number.MAX_SAFE_INTEGER-1)return '装饰编号已满。';uid=p.campManagement.nextId++;p.coins-=d.price;p.campManagement.items.push({uid,type,x:null,y:null});return '';});return {...result,uid:result.ok?uid:null};}
// 确认才提交吸附坐标；预览和取消不写入存档。
export function placeCampDecor(game,uid,x,y){return commit(game,p=>{x=Math.round(x/CAMP_DECOR_GRID)*CAMP_DECOR_GRID;y=Math.round(y/CAMP_DECOR_GRID)*CAMP_DECOR_GRID;const proxy=Object.create(game);proxy.progress=p;const error=campDecorPlacementError(proxy,uid,x,y);if(error)return error;Object.assign(p.campManagement.items.find(i=>i.uid===uid),{x,y});return '';});}
// 收纳保留购买记录和实例号，重新放置不收费。
export function storeCampDecor(game,uid){return commit(game,p=>{const item=p.campManagement.items.find(i=>i.uid===uid);if(!item)return '没有这件装饰。';item.x=item.y=null;return '';});}

// 节庆套装只收一次费用；失败沿用购买事务完整回滚。
export function buyCampFestival(game,id){return commit(game,p=>{const f=campFestival(id);if(!f)return '没有这种节日装扮。';if(p.campManagement.festivals.includes(id))return '';if(p.coins<f.price)return '金币不足。';p.coins-=f.price;p.campManagement.festivals.push(id);return '';});}
// 自动、日常与已购套装自由切换，不改手工摆放的位置。
export function setCampFestival(game,id){return commit(game,p=>{if(!['auto','normal'].includes(id)&&!p.campManagement.festivals.includes(id))return '请先购买这套节日装扮。';p.campManagement.festivalMode=id;return '';});}

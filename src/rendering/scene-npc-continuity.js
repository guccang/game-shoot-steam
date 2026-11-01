// 对话结束只撤销交互，不让仍在镜头中的人物突然消失；记录不参与任务或存档。
import {visibleBodies} from '../world/coordinates.js';
// 为每个渲染器创建独立记录，不跨游戏实例共用 NPC 或时钟。
export function createSceneNpcContinuity(){return {actors:new Map(),mapId:null,epoch:null,storyId:null};}
// 合并当前出场与原地留驻人物，只缓存正式人物，不缓存道具、气泡或任务按钮。
export function sceneNpcObjects(state,game,objects,view){
 const storyId=game.story?.runId||null,epoch=game.combatSight;
 const hidden=!!(game.cottage||game.realm||game.fireActive||game.campDefense||game.workshopTrial||game.arrivalCinematic);
 // 同一会话重开清空旧人；章节结束恢复森林时允许保留仍在镜头内的告别人。
 if(state.mapId!==game.mapId||hidden||state.epoch!==epoch&&state.storyId===storyId)state.actors.clear();
 state.mapId=game.mapId;state.epoch=epoch;state.storyId=storyId;
 if(hidden)return objects;
 const props=objects.filter(o=>!o.sceneNpcId),active=new Map(objects.filter(o=>o.sceneNpcId).map(o=>[o.sceneNpcId,o]));
 for(const [id,actor] of state.actors){if(!active.has(id)&&visibleBodies([actor],view,140).length===0)state.actors.delete(id);}
 for(const [id,actor] of active)state.actors.set(id,{...actor});
 return [...props,...state.actors.values()];
}
// 验收只读取正式渲染器记录，核对稳定身份、坐标和居民去重。
export function inspectSceneNpcContinuity(renderer){return {designCriterion:'scene-npc-continuity',actors:[...(renderer.sceneNpcContinuity?.actors.values()||[])].map(a=>({id:a.sceneNpcId,residentId:a.residentId,x:a.x,y:a.y,kind:a.kind}))};}

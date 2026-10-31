// 故事点击目标共用于现场提示、命中区和距离检查，不通过中文文案推断对象。
import {storyDefinition,storyNode,storyCondition,storyPosition} from './story-definition.js';
import {worldDistance} from '../world/coordinates.js';

// 人物采用正式出场表的脚底与身高；物件采用正式摆件坐标，避免点击落在空地。
export function storyInteractionTarget(game){
 const r=game.story;if(!r)return null;
 const def=storyDefinition(game),o=game.storyObjective(),node=storyNode(game);
 if(r.trial)return {...game.player,kind:'player',width:72,height:game.vehicle.active?100:72};
 const target=node.interactionTarget;
 const actors=(node.actors||[]).filter(a=>a.site===o.site&&storyCondition(r,a.when));
 const actor=target?.actor?actors.find(a=>a.actor===target.actor):!target?.prop?actors[0]:null;
 if(actor){const spec=def.actors[actor.actor];return {...storyPosition(actor,game),kind:actor.actor,
  width:Math.max(64,(spec.halfWidth||0)*2),height:spec.head+24};}
 const props=[...(node.props||[]),...def.props].filter(p=>p.site===o.site&&storyCondition(r,p.when));
 const prop=target?.actor?null:target?.prop?props.find(p=>p.kind===target.prop):props[0];
 if(prop)return {...storyPosition(prop,game),kind:prop.kind,width:prop.kind==='relay'?84:64,
  height:({relay:112,medicine:58,crate:60})[prop.kind]||84};
 if(target)throw Error('故事交互目标未出场：'+def.id+'/'+r.stageId);
 return {...def.world.sites[o.site],kind:'site',width:64,height:64};
}

// 点击范围独立于赶路到达距离；现场提示、点击与调查计时共用更宽的前方操作范围。
export function storyInteractionNear(game,target=storyInteractionTarget(game)){
 if(!target)return false;
 const def=storyDefinition(game),site=def.world.sites[game.storyObjective().site],radius=def.interaction.clickRadius??def.interaction.radius;
 return worldDistance(game.player,target)<=radius||worldDistance(game.player,site)<=radius;
}

// 赶路与未清完的遭遇只显示移动导航，满足当前阶段要求后才显示现场点击提示。
export function storyInteractionReady(game){
 const r=game.story;
 return !!r&&game.mapId===storyDefinition(game).mapId&&!game.realm&&!game.boss&&!r.dialogue&&
  ['playing','story'].includes(game.state)&&r.phase!=='dialogue'&&
  (!!r.trial||storyInteractionNear(game))&&(r.phase!=='active'||!!game.storyObjective().action||!!r.trial);
}

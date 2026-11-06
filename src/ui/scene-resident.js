// 居民的DOM气泡与点击轮廓共用Canvas当前帧位置，交互资格仍由核心逻辑判定。
export const MAP_CAT_HIT={width:76,height:84,foot:12};
export function sceneResident(renderer,actor){
 // 只匹配当前世界已注册的居民实体；未生成表现快照时直接使用逻辑位置。
 if(actor?.type==='camp-resident')return renderer.renderGame?.campActors?.get(actor.id)||actor;
 if(actor?.type!=='living-resident'||renderer.game?.livingActors?.get(actor.id)!==actor)return actor;
 return renderer.renderGame?.livingActors?.get(actor.id)||actor;
}

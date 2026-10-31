// 居民的DOM气泡与点击轮廓共用Canvas当前帧位置，交互资格仍由核心逻辑判定。
export function sceneResident(renderer,actor){
 // 只匹配当前世界已注册的居民实体；未生成表现快照时直接使用逻辑位置。
 if(actor?.type!=='living-resident'||renderer.game?.livingActors?.get(actor.id)!==actor)return actor;
 return renderer.renderGame?.livingActors?.get(actor.id)||actor;
}

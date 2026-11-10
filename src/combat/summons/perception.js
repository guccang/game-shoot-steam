import {surfaceTargetVisible} from '../../world/surface-vision.js';
// 召唤物的视野资格使用正式镜头矩形，武器数值和已发射弹道保持独立。
import { SUMMON_PERCEPTION } from '../../config/summon-behavior.js';
import { nearest } from '../../world/coordinates.js';

// 镜头尚未提供时按同尺寸的普通视野保守估计；无视口的离线规则模拟保持原射程。
export function summonTargetVisible(game,target) {
 if(!surfaceTargetVisible(game,target))return false;
  const size=game.viewport,provided=game.summonView||game.arrivalView;
  if(!size&&!provided)return true;
  const width=size?.width||provided.width,height=size?.height||provided.height;
  const valid=provided&&(game.summonView||provided.width===width&&provided.height===height);
  const zoom=width<500?.85:1.05;
  const view=valid?provided:{left:-width/zoom/2,right:width/zoom/2,top:-height/zoom/2+30,bottom:height/zoom/2+30};
  const observer=game.summonViewOrigin||game.player;
  const point=nearest(target,observer),x=point.x-observer.x,y=point.y-observer.y;
  const scale=width/(view.right-view.left),pad=(game.summonView?SUMMON_PERCEPTION.trialEdgePixels:SUMMON_PERCEPTION.edgePixels)/scale+(target.radius||12);
  // 边缘留出完整怪物轮廓；大视野仍限制为主人附近作战，不能向屏外追逐。
  return Math.hypot(x,y)<=SUMMON_PERCEPTION.radius&&x>=view.left+pad&&x<=view.right-pad&&y>=view.top+pad+18&&y<=view.bottom-pad;
}

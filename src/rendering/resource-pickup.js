// 连续拾取沿用正式金币和木材轮廓，独立图标按各自发射时刻飞向角色。
import {resourcePickupPoses} from '../combat/resource-pickup.js';
import {drawResourceIcon} from './resource-icons.js';
// 图标透明度只影响当前绘制，不泄漏到后续伤害数字与场景。
export function drawResourcePickups(context,drops,player,reduced=false){
 context.save();
 for(const icon of resourcePickupPoses(drops,player,reduced)){
  // 短而低透明的同色拖尾强调吸附方向，不盖住角色，也不改变图标形状。
  if(!reduced){
   context.globalAlpha=icon.alpha*.45;context.strokeStyle=icon.kind==='coins'?'#e5bd65':'#b59666';context.lineWidth=2;context.lineCap='round';
   context.beginPath();context.moveTo(icon.tailX,icon.tailY);context.lineTo(icon.x,icon.y);context.stroke();
  }
  context.globalAlpha=icon.alpha;
  drawResourceIcon(context,icon.kind,icon.x,icon.y,icon.size);
 }
 context.restore();
}

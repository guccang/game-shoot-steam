// 取水复用停车、睡觉与候门的圆环徽记，在天气与树冠之后固定屏幕大小绘制。
import {projectInteractionAnchor} from '../world/interaction-anchors.js';
import {finiteSupply} from '../combat/supply-ammo.js';
import {drawActionCountdown} from './action-countdown.js';

// 水罐圆环按实际水量平滑推进；秒数表示当前水量补满所需时间，暂停保留当前帧。
export function drawWaterBagIndicator(renderer){
 const game=renderer.game,weapon=game.weapon(),mag=game.magazines[game.loadout.weapon];
 renderer.waterBagView=null;
 if(weapon.id!=='water'||!finiteSupply(game)||game.cottage||!['playing','paused'].includes(game.state)||(!mag.waterFilling&&!mag.waterComplete))return;
 const point=projectInteractionAnchor(game.player,renderer.view);if(!point)return;
 const progress=Math.max(0,Math.min(1,(mag.ammo+(mag.waterFraction||0))/weapon.magazineSize));
 const remaining=(1-progress)*weapon.reloadTime,seconds=mag.waterFilling?Math.max(1,Math.ceil(remaining-1e-8)):0;
 const percent=Math.floor(mag.ammo/weapon.magazineSize*100),label=mag.waterFilling?String(seconds):'满';
 const x=Math.max(40,Math.min(renderer.view.w*renderer.view.zoom-40,point.x)),y=point.y-104,c=renderer.c;
 renderer.waterBagView={x,y,width:68,height:34,percent,progress,remaining,seconds,label,icon:'water'};
 c.save();c.setTransform(renderer.dpr,0,0,renderer.dpr,0,0);c.translate(x,y);
 drawActionCountdown(c,{progress,label,icon:'water'});
 c.restore();
}

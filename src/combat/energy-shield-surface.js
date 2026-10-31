// 绘制与拦截共用同一椭圆罩体，坐标为正式世界坐标，跨地图接缝取最近镜像。
import {nearest} from '../world/coordinates.js';
import {segmentCircle} from './collision.js';

// 屏障抬高到角色胸口，驾驶状态扩大罩体以覆盖车壳。
export function energyShieldShape(position,mounted=false){
 return {x:position.x,y:position.y-(mounted?39:32),rx:mounted?102:61,ry:mounted?84:68};
}

// 暂停仍可绘制罩体；真正的命中仅由各战斗更新入口在游玩状态执行。
export function hasEnergyShield(game){
 return game.weapon?.()?.attackKind==='defense'&&(game.magazines?.[game.loadout.weapon]?.ammo||0)>0;
}

// 将来袭方向投到罩体表面；缺少方向的环境伤害落在上缘，不再落在猫身上。
export function energyShieldPoint(game,source,position=game.player){
 const shape=energyShieldShape(position,game.vehicle?.active),point=source?nearest(source,shape):{x:shape.x,y:shape.y-shape.ry};
 const angle=Math.atan2((point.y-shape.y)/shape.ry,(point.x-shape.x)/shape.rx);
 return {x:shape.x+Math.cos(angle)*shape.rx,y:shape.y+Math.sin(angle)*shape.ry,angle};
}

// 对相对移动的椭圆进行扫掠，返回首次接触比例与盾面落点，兼容高速弹与移动中的玩家。
export function traceEnergyShield(game,from,to,previous=game.player,padding=0){
 if(!hasEnergyShield(game))return null;
 const now=energyShieldShape(nearest(game.player,from),game.vehicle?.active),old=energyShieldShape(nearest(previous,now),game.vehicle?.active);
 const rx=now.rx+padding,ry=now.ry+padding;
 const t=segmentCircle({x:(from.x-old.x)/rx,y:(from.y-old.y)/ry},{x:(to.x-now.x)/rx,y:(to.y-now.y)/ry},{x:0,y:0},1);
 if(t===null)return null;
 const center={x:old.x+(now.x-old.x)*t,y:old.y+(now.y-old.y)*t};
 const angle=Math.atan2((from.y+(to.y-from.y)*t-center.y)/ry,(from.x+(to.x-from.x)*t-center.x)/rx);
 return {t,x:center.x+Math.cos(angle)*now.rx,y:center.y+Math.sin(angle)*now.ry,angle};
}

// 近战瞄向最近盾面，仍沿用原有追击、前摇和返回，不把怪物直接传送到边缘。
export function energyShieldMeleeTarget(game,enemy,position=game.player){
 if(!hasEnergyShield(game))return position;
 return {...position,...energyShieldPoint(game,enemy,position),attackRadius:0,shieldSurface:true};
}

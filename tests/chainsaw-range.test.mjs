// 电锯范围专项：正式绘制末端与碰撞扫圆一致，升级、左右瞄准和骑乘均保留接触边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/game.js';
import {effectiveWeapon} from '../src/config/weapon-mods.js';
import {chainsawRange,chainsawTip,heldChainsawSegment} from '../src/combat/chainsaw-geometry.js';
import {cutWithChainsaw} from '../src/combat/melee.js';
import {drawWeapon,drawRiderWeapon} from '../src/rendering/characters.js';
import {PLAYER_SCALE,GUN_SCALE} from '../src/combat/recoil.js';
import {riderPosition} from '../src/config/vehicle-rider.js';

// 记录正式Canvas图元经过缩放、翻转、旋转后的坐标，避免只测两份公式互相相等。
function canvasRecorder(){
 let m=[1,0,0,1,0,0];const stack=[],boxes=[];
 const point=(x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});
 const c={save(){stack.push([...m]);},restore(){m=stack.pop();},translate(x,y){const p=point(x,y);m[4]=p.x;m[5]=p.y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},rotate(a){const [x,y,z,w]=m;m[0]=x*Math.cos(a)+z*Math.sin(a);m[1]=y*Math.cos(a)+w*Math.sin(a);m[2]=-x*Math.sin(a)+z*Math.cos(a);m[3]=-y*Math.sin(a)+w*Math.cos(a);},roundRect(x,y,w,h){boxes.push({x,y,w,h,tip:point(x+w,y+h/2)});}};
 return {boxes,c:new Proxy(c,{get:(o,k)=>o[k]||(()=>{})})};
}
// 使用正式升级配置准备武器，独立于渲染侧范围换算。
function saw(level){const p=freshProgress();p.weapons[14]=1;p.weaponParts[14].range=level;return effectiveWeapon(p,14);}

test('1至5级射程与锯链等量增长，机身及锯链宽度保持原比例',()=>{
 let previous;
 for(let level=1;level<=5;level++){
  const w=saw(level),r=canvasRecorder();drawWeapon(r.c,14,0,0,1,0,0,0,0,w.parts);
  const blade=r.boxes.find(b=>b.x===1&&b.y===-9),body=r.boxes.find(b=>b.x===-24);
  assert.equal(chainsawRange(w.parts),w.range);assert.equal(blade.h,18);assert.equal(body.w,31);assert.equal(body.h,26);
  if(previous)assert.ok(Math.abs((blade.w-previous.w)*PLAYER_SCALE*GUN_SCALE-(w.range-previous.range))<1e-8);
  previous={w:blade.w,range:w.range};
 }
});

test('正式手持绘制锯尖与扫圆边界一致，八方向、后坐、减弱动态及骑乘均适用',()=>{
 for(const level of [1,3,5])for(let n=0;n<8;n++)for(const mounted of [false,true])for(const reduced of [false,true]){
  const w=saw(level),player={x:600,y:500,angle:n*Math.PI/4,walkPhase:.7,recoil:{kick:1.8,rise:.02,flash:.1}};
  const rider=riderPosition(player,{active:mounted,index:5}),r=canvasRecorder();
  drawRiderWeapon(r.c,rider,0,14,{parts:w.parts,motionScale:reduced?.35:1});
  const blade=r.boxes.find(b=>b.x===1&&b.y===-9),segment=heldChainsawSegment(rider,w.range,reduced);
  assert.ok(Math.abs(Math.hypot(blade.tip.x-segment.end.x,blade.tip.y-segment.end.y)-segment.radius)<1e-8);
 }
});

test('实际切割只有接触锯尖才伤害，升级后新增长度可命中，树木仍遮挡后方怪物',()=>{
 for(const level of [1,5])for(const mounted of [false,true]){
  const w=saw(level),player={x:600,y:500,angle:0,recoil:{},walkPhase:0},vehicle={active:mounted,index:5};
  const segment=heldChainsawSegment(riderPosition(player,vehicle),w.range);
  const enemy={id:1,type:'slime',hp:100,radius:12,x:segment.end.x+segment.radius+12+.1,y:segment.end.y+8};
  const hits=[],g={player,vehicle,trees:[],enemies:[enemy],onEvent(){},fx:{add(){}},hit(t){hits.push(t.id);}};
  cutWithChainsaw(g,w,{x:0,y:0},{x:1,y:0},1,false,false);assert.deepEqual(hits,[]);
  enemy.x-=.2;cutWithChainsaw(g,w,{x:0,y:0},{x:1,y:0},1,false,false);assert.deepEqual(hits,[1]);
  hits.length=0;g.trees=[{...enemy,id:2,type:'tree',x:segment.start.x+15}];cutWithChainsaw(g,w,{},{},1,false,false);assert.deepEqual(hits,[2]);
 }
});

test('浮游炮与载具的可见锯尖保持原独立挂载射程',()=>{
 for(const scale of [.42,.75])for(const level of [1,5]){
  const w=saw(level),r=canvasRecorder(),origin=17-64*scale;
  drawWeapon(r.c,14,origin,0,scale,0,0,0,0,w.parts,0,chainsawTip(w.range,scale,true));
  assert.ok(Math.abs(r.boxes.find(b=>b.x===1&&b.y===-9).tip.x-w.range)<1e-8);
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
   const direction={x:Math.cos(angle),y:Math.sin(angle)},enemy={id:1,hp:100,radius:12,x:direction.x*(w.range+12+.1),y:direction.y*(w.range+12+.1)+8},hits=[];
   const game={enemies:[enemy],trees:[],player:{angle},onEvent(){},fx:{add(){}},hit(t){hits.push(t.id);}};
   const muzzle={x:direction.x*17,y:direction.y*17},weapon={...w,sawScale:scale,sawAngle:angle};
   cutWithChainsaw(game,weapon,muzzle,direction,1,false,true);assert.deepEqual(hits,[]);
   enemy.x-=direction.x*.2;enemy.y-=direction.y*.2;cutWithChainsaw(game,weapon,muzzle,direction,1,false,true);assert.deepEqual(hits,[1]);
  }
 }
});

// 临时射程祝福不写回永久等级，但锯链必须读到同一最终范围。
test('秘境射程祝福同步可见长度且不污染永久部件',async()=>{
 const {realmWeapon}=await import('../src/config/realms.js');const original=saw(5),before=structuredClone(original.parts);
 const boosted=realmWeapon(original,{reach:3});assert.ok(boosted.range>original.range);assert.equal(chainsawRange(boosted.parts),boosted.range);assert.deepEqual(original.parts,before);
});

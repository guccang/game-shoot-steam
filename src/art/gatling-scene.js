import { loadCozyCottage } from '../rendering/cozy-cottage.js';
// 隔离试玩使用正式应用和内存存档；固定耐久靶只服务外观、动作及命中检查。
import { restoreArrival } from '../core/camp/ranger-arrival.js';
import { createApplication } from '../app/create-app.js';
import { loadGameFont } from '../platform/fonts.js';
import { freshProgress, validateProgress } from '../progression/progress.js';
import { catSprites } from '../rendering/cat-animation.js';
import { EnvironmentTransition } from '../world/environment.js';
import { SceneTone } from '../rendering/scene-tone.js';
import { drawWeapon } from '../rendering/characters.js';
import { drawEquipmentPart } from '../rendering/equipment-parts.js';
import { equipmentParts } from '../config/equipment-parts.js';
import { i18nText } from '../i18n/index.js';
import { box, oval, outline } from '../rendering/primitives.js';
import { drawRotaryBarrels } from '../rendering/rotary-barrels.js';
const origin=new URL(import.meta.url).origin;
const memory=new Map([['forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false})]]);
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
await loadGameFont();await loadCozyCottage();
const app=createApplication({getStorage:()=>storage}),g=app.game;
let tank=false,shooting=true,target=null,direction=0,drive=0,lastReport=0,recording=false,stage='base';
const update=g.update.bind(g);
// 真实位移、转子和弹药仍由 Game 推进，只固定靶标避免连续击退离开视野。
g.update=(dt,input)=>{
  if(target&&g.enemies.includes(target))Object.assign(target,{x:g.player.x+Math.cos(direction)*125,y:g.player.y+Math.sin(direction)*125,vx:0,vy:0});
  if(drive>0&&g.state==='playing'){input=[{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}][Math.min(3,Math.floor(4-drive))];drive=Math.max(0,drive-dt);}
  // 停火验收暂时排除可采集树作为攻击候选，更新后立即恢复场景树木。
  const trees=g.trees;if(!shooting)g.trees=[];
  try{update(dt,input);}finally{if(!shooting)g.trees=trees;}
  lastReport+=dt;if(lastReport>.3){lastReport=0;report();}
};
// 调试信息来自真实游戏状态，不将该信息作为美术验收替代品。
function report(extra={}){
  const m=tank?g.vehicle.module?.magazine:g.magazines[2];
  parent.postMessage({gatlingReport:{tank,stage,parts:g.weapon().parts,shooting,width:innerWidth,time:app.environment.time,state:g.state,cat:catSprites.status,
    rotor:m?.rotor,speed:m?.rotorSpeed,
    ammo:m?.ammo,heat:m?.heat,recoil:tank?g.vehicle.recoil:g.player.recoil,player:[g.player.x,g.player.y],...extra}},origin);
}
// 构建可长期试射的靶位，不覆盖正式武器攻击、后坐或弹仓更新函数。
function setTarget(){
  g.enemies=[];target=null;if(!shooting)return;
  target=g.spawnEnemy(0,0,{x:g.player.x+125,y:g.player.y});
  Object.assign(target,{hp:1e9,maxHp:1e9,speed:0,damage:0,football:true,mass:10000});
}
// 每次更换演示模式重建内存进度，正式玩家资源不参与读写。
function setup(mounted){
  tank=mounted;shooting=true;direction=0;drive=0;
  const p=freshProgress();p.weapons[2]=1;p.weapon=2;p.vehicleHulls[1]=1;p.vehicleIndex=1;p.vehicleLoadouts[1]=2;p.vehicleWeapons[2]=1;p.coins=p.wood=100000;p.bosses=100;p.mastery.fill(40);
  // 三档仅写入试玩内存进度，战斗属性和外形都从正式等级规则产生。
  const level=stage==='upgraded'?5:stage==='middle'?3:1,damage=stage==='upgraded'?20:stage==='middle'?10:1;
  p.weapons[2]=p.vehicleWeapons[2]=damage;
  for(const field of ['weaponParts','turretParts'])p[field][2]={rate:level,capacity:level,reload:level,range:level,accuracy:level};
  g.progress=validateProgress(p);g.reset();restoreArrival(g);g.start();if(tank)g.summonVehicle();
  g.updateWaves=()=>{};g.waveWarning=0;g.enemies=[];g.boss=null;
  Object.assign(g.player,{x:900,y:850,invincible:0});setTarget();
  Object.assign(app.environment,{weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
  app.renderer.seasons.reset('summer');app.renderer.light=new EnvironmentTransition(app.environment);app.renderer.tone=new SceneTone(app.environment);
  app.renderer.camera.time=null;app.refresh();report();
}
// 图像差异检查拆件、各级外形及六管运动，实际审美仍在同屏截图中复核。
function hash(draw){
  const c=document.createElement('canvas').getContext('2d');c.canvas.width=360;c.canvas.height=240;c.translate(150,100);c.scale(3,3);draw(c);return c.canvas.toDataURL();
}
// 暂停检查使用正式状态；所有部件逐级检查，避免最高级遮住转管或拆卸后失效。
async function checks(){
  const results={parts:{},rotor:true};
  // 原装回归对照保留改造前四个图元与原六管绘制器，只在调试检查中使用。
  const original=hash(c=>{
    box(c,-5,2,9,17,3,'#8f7152','#3c4b3b',2.5);
    box(c,-15,-11,27,22,5,'#7b8866',outline);
    oval(c,-9,7,11,10,'#ac9c68',outline);
    drawRotaryBarrels(c,0,43,0);
    box(c,2,-17,14,5,2,'#ddbc70',outline);
  });
  results.originalRestored=original===hash(c=>drawWeapon(c,2));
  for(const p of equipmentParts('weapons',2)){
    const images=new Set();for(let level=1;level<=p.max;level++)images.add(hash(c=>drawEquipmentPart(c,2,p,level,true)));
    const levels={damage:20,rate:5,capacity:5,reload:5,range:5,accuracy:5};
    const omitted={...levels,omitted:p.key};
    results.parts[p.key]={levels:images.size===p.max,removed:hash(c=>drawWeapon(c,2,0,0,1,0,0,0,0,levels))!==hash(c=>drawWeapon(c,2,0,0,1,0,0,0,0,omitted))};
    for(const parts of [levels,omitted])results.rotor&&=hash(c=>drawWeapon(c,2,0,0,1,0,0,0,0,parts,0))!==hash(c=>drawWeapon(c,2,0,0,1,0,0,0,0,parts,.37));
  }
  const state=g.state;g.state='paused';const pose=JSON.stringify([g.magazines[2],g.player.recoil,g.vehicle.rotor]);
  await new Promise(resolve=>setTimeout(resolve,180));results.pause=pose===JSON.stringify([g.magazines[2],g.player.recoil,g.vehicle.rotor]);g.state=state;app.refresh();
  results.passed=results.originalRestored&&results.rotor&&results.pause&&Object.values(results.parts).every(p=>p.levels&&p.removed);
  // 检查结果保留至下一次操作，避免被实时状态刷新覆盖。
  lastReport=-1e6;report({checks:results});
}
// 录制真实战场的连射、停转、再启动、转向和移动，不用静帧合成动作。
async function recordMotion(){
  recording=true;setup(tank);
  const stream=document.getElementById('game').captureStream(30),chunks=[],samples=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
  const finished=new Promise(resolve=>{recorder.onstop=resolve;});
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.start();
  try{
    for(let step=0;step<36;step++){
      if(step===12){shooting=false;setTarget();}
      if(step===24){shooting=true;direction=Math.PI;setTarget();}
      if(step===30)drive=4;
      await new Promise(resolve=>setTimeout(resolve,250));
      const m=tank?g.vehicle.module.magazine:g.magazines[2];
      samples.push({time:step*.25,shooting,rotor:m.rotor,speed:m.rotorSpeed,ammo:m.ammo,kick:(tank?g.vehicle.recoil:g.player.recoil).kick});
    }
  }finally{recorder.stop();await finished;stream.getTracks().forEach(track=>track.stop());recording=false;}
  const reader=new FileReader();reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));
  reader.onload=()=>parent.postMessage({gatlingRecording:reader.result},origin);
  lastReport=-1e6;report({motion:samples});
}
// 仅允许同源父页面的有限命令，不开放任意脚本执行或外部存档注入。
window.addEventListener('message',async event=>{
  if(event.source!==parent||event.origin!==origin||!event.data.gatlingCommand)return;
  try{
    if(recording)return;
    const command=event.data.gatlingCommand;
    if(document.querySelector('dialog[open]')&&command!=='night'){report({notice:i18nText('art.gatling.closeDialog')});return;}
    lastReport=0;
    if(command==='hand'||command==='tank')setup(command==='tank');
    if(command==='stage'&&['base','middle','upgraded'].includes(event.data.stage)){stage=event.data.stage;setup(tank);}
    if(command==='fire'){shooting=!shooting;setTarget();}
    if(command==='turn')direction+=Math.PI/2;
    if(command==='drive')drive=4;
    if(command==='pause'){g.pause();app.refresh();}
    if(command==='workshop')app.workshop.open('weapons',2);
    if(command==='night'){
      Object.assign(app.environment,{time:app.environment.time==='night'?'day':'night',weather:'sun',autoTime:false,autoWeather:false});
      app.renderer.light=new EnvironmentTransition(app.environment);app.renderer.tone=new SceneTone(app.environment);
    }
    if(command==='checks'){await checks();return;}report();
    if(command==='record')await recordMotion();
  }catch(error){recording=false;report({error:String(error.stack||error)});}
});
window.addEventListener('error',event=>report({error:event.message}));
if(!await app.ready||!await catSprites.load())throw Error(i18nText('startup.failed'));
app.menu.enter();Object.assign(app.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false});
app.renderer.light=new EnvironmentTransition(app.environment);app.renderer.tone=new SceneTone(app.environment);setup(false);

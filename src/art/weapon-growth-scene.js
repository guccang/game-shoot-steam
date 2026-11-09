import { loadCozyCottage } from '../rendering/cozy-cottage.js';
import { loadGameFont } from '../platform/fonts.js';
// 隔离试玩使用正式应用和内存存档；固定耐久靶只服务外观、动作及命中检查。
import { restoreArrival } from '../core/camp/ranger-arrival.js';
import { createApplication } from '../app/create-app.js';
import { freshProgress, validateProgress } from '../progression/progress.js';
import { catSprites } from '../rendering/cat-animation.js';
import { EnvironmentTransition } from '../world/environment.js';
import { SceneTone } from '../rendering/scene-tone.js';
import { equipmentParts } from '../config/equipment-parts.js';
import { i18nText } from '../i18n/index.js';
import { VEHICLE_WEAPONS } from '../config/vehicle-armaments.js';
import { vehicleWeapon } from '../config/vehicles.js';
const origin=new URL(import.meta.url).origin;
const memory=new Map([['forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false})]]);
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
await loadGameFont();await loadCozyCottage();
const app=createApplication({getStorage:()=>storage}),g=app.game;
let tank=false,shooting=true,target=null,direction=0,drive=0,lastReport=0,recording=false,stage='base',weaponIndex=0;
const update=g.update.bind(g);
// 真实位移、转子和弹药仍由 Game 推进，只固定靶标避免连续击退离开视野。
g.update=(dt,input)=>{
  if(target&&g.enemies.includes(target))Object.assign(target,{x:g.player.x+Math.cos(direction)*(weaponIndex===14?48:125),y:g.player.y+Math.sin(direction)*(weaponIndex===14?48:125),vx:0,vy:0});
  if(drive>0&&g.state==='playing'){input=[{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}][Math.min(3,Math.floor(4-drive))];drive=Math.max(0,drive-dt);}
  // 停火验收暂时排除可采集树作为攻击候选，更新后立即恢复场景树木。
  const trees=g.trees;if(!shooting)g.trees=[];
  try{update(dt,input);}finally{if(!shooting)g.trees=trees;}
  lastReport+=dt;if(lastReport>.3){lastReport=0;report();}
};
// 调试信息来自真实游戏状态，不将该信息作为美术验收替代品。
function report(extra={}){
  const m=tank?g.vehicle.module?.magazine:g.magazines[Math.min(16,weaponIndex)];
  parent.postMessage({gatlingReport:{tank,weaponIndex,stage,parts:(tank?vehicleWeapon(g.loadout,g.vehicle.weaponIndex):g.weapon()).parts,shooting,width:innerWidth,time:app.environment.time,state:g.state,cat:catSprites.status,
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
  const p=freshProgress(),hand=weaponIndex<17?weaponIndex:0,hull=VEHICLE_WEAPONS[weaponIndex].hullIndex??1;
  if(weaponIndex>=17)tank=true;
  p.weapons[hand]=1;p.weapon=hand;p.vehicleHulls[hull]=1;p.vehicleIndex=hull;p.vehicleLoadouts[hull]=weaponIndex;p.vehicleWeapons[weaponIndex]=1;p.coins=p.wood=100000;p.bosses=100;p.mastery.fill(1000);
  // 测试各级真实进度，永久玩家存档不参与；协同遵循各装备自己的上限。
  for(const kind of ['weapons','turret']){
    const index=kind==='weapons'?hand:weaponIndex,field=kind==='weapons'?'weaponParts':'turretParts';
    for(const part of equipmentParts(kind,index)){
      const level=stage==='upgraded'?part.max:stage==='middle'?Math.ceil(part.max/2):1;
      if(part.key==='damage')p[kind==='weapons'?'weapons':'vehicleWeapons'][index]=level;
      else p[field][index][part.key]=level;
    }
  }
  g.progress=validateProgress(p);g.reset();restoreArrival(g);g.start();if(tank)g.summonVehicle();
  g.updateWaves=()=>{};g.waveWarning=0;g.enemies=[];g.boss=null;
  Object.assign(g.player,{x:900,y:850,invincible:0});setTarget();
  Object.assign(app.environment,{weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
  app.renderer.seasons.reset('summer');app.renderer.light=new EnvironmentTransition(app.environment);app.renderer.tone=new SceneTone(app.environment);
  app.renderer.camera.time=null;app.refresh();report();
}
// 暂停检查读取实际状态，结构逐级检查由父页面正式工坊绘制器负责。
async function checks(){
  const state=g.state;g.state='paused';
  const pose=JSON.stringify([g.magazines,g.player.recoil,g.vehicle.rotor]);
  await new Promise(resolve=>setTimeout(resolve,180));
  const paused=pose===JSON.stringify([g.magazines,g.player.recoil,g.vehicle.rotor]);
  g.state=state;app.refresh();lastReport=-1e6;report({checks:{paused}});
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
      const m=tank?g.vehicle.module.magazine:g.magazines[Math.min(16,weaponIndex)];
      samples.push({time:step*.25,shooting,rotor:m?.rotor,speed:m?.rotorSpeed,ammo:m?.ammo,kick:(tank?g.vehicle.recoil:g.player.recoil).kick});
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
    if(command==='weapon'&&Number.isInteger(event.data.index)&&VEHICLE_WEAPONS[event.data.index]){weaponIndex=event.data.index;setup(weaponIndex>=17||tank);}
    if(command==='stage'&&['base','middle','upgraded'].includes(event.data.stage)){stage=event.data.stage;setup(tank);}
    if(command==='fire'){shooting=!shooting;setTarget();}
    if(command==='turn')direction+=Math.PI/2;
    if(command==='drive')drive=4;
    if(command==='pause'){g.pause();app.refresh();}
    if(command==='workshop')app.workshop.open(weaponIndex>=17?'vehicle':'weapons',weaponIndex>=17?g.progress.vehicleIndex:weaponIndex);
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

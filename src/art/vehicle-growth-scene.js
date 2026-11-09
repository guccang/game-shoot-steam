import { loadCozyCottage } from '../rendering/cozy-cottage.js';
// 载具改装验收使用正式应用、临时存档和真实驾驶输入。
import {loadGameFont} from '../platform/fonts.js';
import {createApplication} from '../app/create-app.js';
import {freshProgress,validateProgress} from '../progression/progress.js';
import {restoreArrival} from '../core/camp/ranger-arrival.js';
import {catSprites} from '../rendering/cat-animation.js';
import {EnvironmentTransition} from '../world/environment.js';
import {SceneTone} from '../rendering/scene-tone.js';
const origin=new URL(import.meta.url).origin,memory=new Map([['forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false})]]);
const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
await loadGameFont();await loadCozyCottage();const app=createApplication({getStorage:()=>storage}),g=app.game;
let index=0,armor=1,engine=1,drive=0,direction=0,shooting=true,target=null,recording=false,reportClock=0;
const update=g.update.bind(g);
// 只固定耐久靶和输入方向；轮角、履带、驾驶姿态及后坐由正式 Game 更新。
g.update=(dt,input)=>{
 if(target&&g.enemies.includes(target))Object.assign(target,{x:g.player.x+Math.cos(direction)*150,y:g.player.y+Math.sin(direction)*150,vx:0,vy:0});
 if(drive>0&&g.state==='playing'){input=[{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}][Math.min(3,Math.floor((8-drive)/2))];drive=Math.max(0,drive-dt);}
 const trees=g.trees;if(!shooting)g.trees=[];try{update(dt,input);}finally{if(!shooting)g.trees=trees;}
 reportClock+=dt;if(reportClock>.4){reportClock=0;report();}
};
// 同时记录驾驶位移、局部相位和真实部件级别。
function state(){return {index,armor:g.progress.vehicleHulls[index],engine:g.progress.vehicleParts[index].engine,active:g.vehicle.active,time:app.environment.time,state:g.state,width:innerWidth,position:[g.player.x,g.player.y],walkPhase:g.player.walkPhase,wheelPhase:g.vehicle.wheelPhase,clock:g.time,kick:g.vehicle.recoil?.kick,cat:g.player.bodyAnimation};}
// 状态报告只供同源验收页读取，不作为正式玩家接口。
function report(extra={}){parent.postMessage({vehicleReport:{...state(),...extra}},origin);}
// 测试靶无攻击能力，保留真实命中和发射过程。
function setTarget(){g.enemies=[];target=null;if(!shooting)return;target=g.spawnEnemy(0,0,{x:g.player.x+150,y:g.player.y});Object.assign(target,{hp:1e9,maxHp:1e9,speed:0,damage:0,football:true,mass:10000});}
// 每次更换型号重建隔离场景，不修改玩家存档和永久资源。
function setup(){
 const p=freshProgress();p.vehicleIndex=index;p.vehicleHulls[index]=armor;p.vehicleParts[index].engine=engine;p.coins=p.wood=100000;p.bosses=100;p.mastery.fill(1000);
 g.progress=validateProgress(p);g.reset();restoreArrival(g);g.start();g.summonVehicle();drive=0;direction=0;shooting=true;
 g.updateWaves=()=>{};g.waveWarning=0;g.boss=null;Object.assign(g.player,{x:900,y:850,invincible:0});setTarget();
 Object.assign(app.environment,{weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});app.renderer.seasons.reset('summer');app.renderer.light=new EnvironmentTransition(app.environment);app.renderer.tone=new SceneTone(app.environment);app.renderer.camera.time=null;app.refresh();report();
}
// 连续录下行驶、停驻、暂停、恢复、反向移动；不以静帧拼接动作。
async function record(){
 recording=true;setup();const samples=[],chunks=[],stream=document.getElementById('game').captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
 const done=new Promise(resolve=>recorder.onstop=resolve);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();
 try{for(let n=0;n<44;n++){if(n===0)drive=4;if(n===12)drive=0;if(n===20)g.pause();if(n===26)g.pause();if(n===30){direction=Math.PI;drive=8;}await new Promise(resolve=>setTimeout(resolve,250));samples.push(state());}}
 finally{recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());recording=false;}
 const reader=new FileReader();reader.onload=()=>parent.postMessage({vehicleRecording:reader.result},origin);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));reportClock=-1e6;report({motion:samples});
}
// 同源父页面的有限控制；工坊打开期间不重置正在施工的场景。
window.addEventListener('message',async e=>{
 if(e.source!==parent||e.origin!==origin||!e.data.vehicleCommand||recording)return;
 try{const cmd=e.data.vehicleCommand;if(document.querySelector('dialog[open]')&&cmd!=='night'){report({notice:'请先关闭工坊'});return;}
 if(cmd==='setup'&&Number.isInteger(e.data.index)&&e.data.index>=0&&e.data.index<8){index=e.data.index;armor=Math.max(1,Math.min(20,+e.data.armor||1));engine=Math.max(1,Math.min(5,+e.data.engine||1));setup();}
 if(cmd==='drive')drive=8;if(cmd==='turn')direction+=Math.PI/2;if(cmd==='fire'){shooting=!shooting;setTarget();}if(cmd==='pause'){g.pause();app.refresh();}
 if(cmd==='workshop')app.workshop.open('vehicle',index);
 if(cmd==='night'){app.environment.time=app.environment.time==='night'?'day':'night';app.renderer.light=new EnvironmentTransition(app.environment);app.renderer.tone=new SceneTone(app.environment);}
 if(cmd==='record')await record();else report();
 }catch(error){recording=false;report({error:String(error.stack||error)});}
});
window.addEventListener('error',e=>report({error:e.message}));
if(!await app.ready||!await catSprites.load())throw Error('载具试玩资源加载失败');app.menu.enter();app.environment.time='day';setup();

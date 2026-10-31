import { loadGameFont } from '../platform/fonts.js';
// 全武器成长工作台：所有图像取自正式工坊；真实试玩使用独立内存进度。
import { localizeDocument } from '../i18n/document.js';
import { VEHICLE_WEAPONS } from '../config/vehicle-armaments.js';
import { equipmentParts } from '../config/equipment-parts.js';
import { freshProgress } from '../progression/progress.js';
import { drawWorkshopEquipment } from '../rendering/workshop.js';
import { drawEquipmentPart } from '../rendering/equipment-parts.js';
localizeDocument(document);
await loadGameFont();
const selector=document.getElementById('weapon'),frame=document.getElementById('scene'),report=document.getElementById('report');
// 等级从正式目录取得，兼容机械体协同和车型专属主炮。
function progress(index,stage){
  const p=freshProgress(),kind=index<17?'weapons':'turret';
  for(const part of equipmentParts(kind,index)){
    const level=stage==='base'?1:stage==='middle'?Math.ceil(part.max/2):part.max;
    if(part.key==='damage')p[index<17?'weapons':'vehicleWeapons'][index]=level;
    else p[index<17?'weaponParts':'turretParts'][index][part.key]=level;
  }
  return p;
}
// 同型号三个阶段共用画布与工坊倍率，不为满级单独放大。
function paint(canvas,index,stage,time=0){drawWorkshopEquipment(canvas.getContext('2d'),progress(index,stage),index<17?'weapons':'turret',index,time);}
// 取原始RGBA散列作回归证据，不把像素不同当作审美合格。
function hash(canvas){let n=2166136261;for(const v of canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data)n=Math.imul(n^v,16777619);return n>>>0;}
// 当前型号大图与三个成长阶段同步更新。
function selection(){for(const id of ['base','middle','upgraded'])paint(document.getElementById(id),Number(selector.value),id);}
for(const [index,w] of VEHICLE_WEAPONS.entries()){
  const option=document.createElement('option');option.value=index;option.textContent=w.name;selector.append(option);
  const figure=document.createElement('figure'),label=document.createElement('figcaption'),canvas=document.createElement('canvas');
  label.textContent=w.name;canvas.width=560;canvas.height=520;figure.append(label,canvas);document.getElementById('catalog').append(figure);
  const tile=document.createElement('canvas');tile.width=560;tile.height=260;
  for(const [row,stage] of ['base','upgraded'].entries()){paint(tile,index,stage);canvas.getContext('2d').drawImage(tile,0,row*260);}
}
selection();
const response=await fetch('/index.html');if(!response.ok)throw Error(`HTTP ${response.status}`);
frame.srcdoc=(await response.text()).replace('<head>','<head><base href="'+location.origin+'/"><meta name="referrer" content="same-origin">')
 .replace('<html lang="zh-CN">','<html lang="zh-CN" data-locale="'+document.documentElement.lang+'">').replace('src="/src/main.js"','src="/src/art/weapon-growth-scene.js"');
// 只传递有限测试命令，不通过页面执行任意脚本。
function command(name,extra={}){frame.contentWindow.postMessage({gatlingCommand:name,...extra},location.origin);}
selector.addEventListener('change',()=>{selection();command('weapon',{index:Number(selector.value)});});
document.getElementById('stage').addEventListener('change',event=>command('stage',{stage:event.target.value}));
document.getElementById('size').addEventListener('change',event=>{frame.style.width=event.target.value+'px';frame.style.height=event.target.value==='1280'?'844px':'';});
for(const b of document.querySelectorAll('[data-command]'))b.addEventListener('click',()=>command(b.dataset.command));
// 全型号检查正式原装画面与各部件等级；报告可保存后用于修改前后对照。
async function checkAll(){
  const results={base:{},parts:{},growth:{},removed:{}};const canvas=document.createElement('canvas');canvas.width=560;canvas.height=320;
  for(let index=0;index<VEHICLE_WEAPONS.length;index++){
    // 按型号让出主线程，检查不会阻塞按钮输入或误触发长任务超时。
    await new Promise(requestAnimationFrame);
    results.base[index]=[0,.37].map(time=>{paint(canvas,index,'base',time);return hash(canvas);});
    paint(canvas,index,'upgraded');const full=hash(canvas);results.growth[index]=full!==results.base[index][0];
    results.parts[index]={};
    results.removed[index]={};
    for(const part of equipmentParts(index<17?'weapons':'turret',index)){
      drawWorkshopEquipment(canvas.getContext('2d'),progress(index,'upgraded'),index<17?'weapons':'turret',index,0,false,{part:part.key});
      results.removed[index][part.key]=hash(canvas)!==full;
      const images=new Set();
      for(let level=1;level<=part.max;level++){
        const c=canvas.getContext('2d');c.resetTransform();c.clearRect(0,0,560,320);c.save();c.translate(280,160);c.scale(3,3);drawEquipmentPart(c,index,part,level,true);c.restore();images.add(hash(canvas));
      }
      results.parts[index][part.key]=images.size===part.max;
    }
  }
  const before=await fetch('/docs/art-reference/weapon-upgrades/before.json');
  if(before.ok){const original=await before.json();results.initialUnchanged=Object.fromEntries(Object.keys(results.base).map(index=>[index,JSON.stringify(results.base[index])===JSON.stringify(original.base[index])]));}
  document.getElementById('checks').textContent=JSON.stringify(results,null,2);
}
document.getElementById('check-all').addEventListener('click',checkAll);
let sceneReady=false;
window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==location.origin)return;
  if(event.data.gatlingReport){
    report.textContent=JSON.stringify(event.data.gatlingReport,null,2);
    // 首次载入完成再同步选择，避免用户在图集加载期间切换型号导致画面与下拉框不同。
    if(!sceneReady&&event.data.gatlingReport.cat==='ready'){
      sceneReady=true;command('weapon',{index:Number(selector.value)});command('stage',{stage:document.getElementById('stage').value});
    }
  }
  if(event.data.gatlingRecording){let video=document.getElementById('recording');if(!video){video=document.createElement('video');video.id='recording';video.controls=true;video.style.maxWidth='100%';report.after(video);}video.src=event.data.gatlingRecording;}
});

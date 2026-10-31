// 载具工作台只组合正式工坊入口；同倍率对比不改车身比例。
import {loadGameFont} from '../platform/fonts.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {freshProgress} from '../progression/progress.js';
import {drawWorkshopEquipment} from '../rendering/workshop.js';
import {equipmentParts} from '../config/equipment-parts.js';
import {drawEquipmentPart} from '../rendering/equipment-parts.js';
await loadGameFont();
const select=document.getElementById('vehicle'),frame=document.getElementById('scene');
// 原装主炮保持一级，确保比较仅反映装甲和动力的变化。
function progress(index,armor=1,engine=1){const p=freshProgress();p.vehicleHulls[index]=armor;p.vehicleParts[index].engine=engine;return p;}
// 透明画布保留原车体与旋翼外包围。
function paint(canvas,index,armor,engine,time=0,assembly=null){drawWorkshopEquipment(canvas.getContext('2d'),progress(index,armor,engine),'vehicle',index,time,false,assembly);}
// 记录实际像素，不以不同散列替代审美判断。
function hash(canvas){let n=2166136261;for(const x of canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data)n=Math.imul(n^x,16777619);return n>>>0;}
// 三个阶段固定相同型号和视野。
function selection(){for(const [id,a,e] of [['base',1,1],['middle',10,3],['upgraded',20,5]])paint(document.getElementById(id),+select.value,a,e);}
for(const [i,v] of COLLECTED_VEHICLES.entries()){
 const o=document.createElement('option');o.value=i;o.textContent=v.name;select.append(o);
 const f=document.createElement('figure'),label=document.createElement('figcaption'),c=document.createElement('canvas');label.textContent=v.name;c.width=560;c.height=720;f.append(label,c);document.getElementById('catalog').append(f);
 const tile=document.createElement('canvas');tile.width=560;tile.height=360;
 paint(tile,i,1,1);c.getContext('2d').drawImage(tile,0,0);paint(tile,i,20,5);c.getContext('2d').drawImage(tile,0,360);
}
selection();
// 只向同源试玩发送有限状态，永久存档不参与。
function command(name,extra={}){frame.contentWindow.postMessage({vehicleCommand:name,...extra},location.origin);}
// 型号与两个部件等级一起发送，避免半更新配置。
function sync(){command('setup',{index:+select.value,armor:+document.getElementById('armor').value,engine:+document.getElementById('engine').value});}
select.addEventListener('change',()=>{selection();sync();});for(const id of ['armor','engine'])document.getElementById(id).addEventListener('change',sync);
document.getElementById('size').addEventListener('change',e=>{frame.style.width=e.target.value+'px';frame.style.height=e.target.value==='1280'?'844px':'';});
for(const b of document.querySelectorAll('[data-command]'))b.addEventListener('click',()=>command(b.dataset.command));
let ready=false;
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.origin!==location.origin)return;if(e.data.vehicleReport){document.getElementById('report').textContent=JSON.stringify(e.data.vehicleReport,null,2);if(!ready){ready=true;sync();}}if(e.data.vehicleRecording)document.getElementById('recording').src=e.data.vehicleRecording;});
// 比较原装相位、逐级独立结构和满级拆装，所有图像来自正式入口。
document.getElementById('check').addEventListener('click',async()=>{
 const c=document.createElement('canvas');c.width=560;c.height=360;const r={base:{},growth:{},levels:{},removed:{}};
 for(let i=0;i<COLLECTED_VEHICLES.length;i++){
  await new Promise(requestAnimationFrame);r.base[i]=[0,.37,1.1].map(t=>{paint(c,i,1,1,t);return hash(c);});paint(c,i,20,5);const full=hash(c);r.growth[i]=full!==r.base[i][0];r.levels[i]={};r.removed[i]={};
  for(const p of equipmentParts('vehicle',i)){paint(c,i,20,5,0,{kind:'vehicle',part:p.key});r.removed[i][p.key]=hash(c)!==full;const hs=new Set();for(let l=1;l<=p.max;l++){const ctx=c.getContext('2d');ctx.resetTransform();ctx.clearRect(0,0,c.width,c.height);ctx.save();ctx.translate(280,180);ctx.scale(3,3);drawEquipmentPart(ctx,i,p,l,true);ctx.restore();hs.add(hash(c));}r.levels[i][p.key]=hs.size===p.max;}
 }
 const response=await fetch('/docs/art-reference/vehicle-upgrades/before-current-master.json');if(response.ok){const old=await response.json();r.initialUnchanged=Object.fromEntries(Object.keys(r.base).map(i=>[i,JSON.stringify(r.base[i])===JSON.stringify(old.base[i])]));}document.getElementById('checks').textContent=JSON.stringify(r,null,2);
});
const response=await fetch('/index.html');if(!response.ok)throw Error('试玩页面加载失败');frame.srcdoc=(await response.text()).replace('<head>','<head><base href="'+location.origin+'/">').replace('src="/src/main.js"','src="/src/art/vehicle-growth-scene.js"');

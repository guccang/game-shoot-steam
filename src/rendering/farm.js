// 直接复用林间小院的真实透明图集边界；植物三阶段均为独立图案，脚底锚点固定。
import {productionObjects,drawProductionGround} from './farm-production.js';
export {drawFarmTool} from './farm-tools.js';
import {FARM_CROP_SIZE} from '../config/farm-tools.js';
import {sampleCropGrowth,drawGrowingCrop,drawCropChange} from './farm-growth.js';
import manifest from '../../assets/farm/manifest.json' with {type:'json'};
const sheets=new Map();let pending=null,cropMarkupId=0;
// 只解码清单中的共享图集，缺失明确抛错，不能以占位植物掩盖加载错误。
export function loadFarmArt(){
 return pending??=Promise.all(manifest.runtimeFiles.map(file=>new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>{sheets.set(file,image);resolve();};image.onerror=()=>{pending=null;reject(Error('农田作物图集加载失败：'+file));};image.src='/assets/farm/'+file;
 })));
}
// 控件与世界作物共用清单；显式裁切单株，横持短图标留白处也不会露出相邻图集格。
export function farmCropMarkup(index,stage=2){const a=manifest.crops[`crop-${index}-${stage}`];if(!a)throw Error('未知作物图片');const id='farm-crop-clip-'+cropMarkupId++,[x,y,width,height]=a.rect;return `<svg viewBox="${a.rect.join(' ')}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><image href="/assets/farm/${a.file}" width="${a.sheet[0]}" height="${a.sheet[1]}" clip-path="url(#${id})"/></svg>`;}
// 收获物飞行直接裁切成熟作物图集，中心锚点与拾取轨迹一致，不增加位图缓存。
export function drawHarvestIcon(c,index,x,y,size=23){
 const a=manifest.crops[`crop-${index}-2`];if(!a)throw Error('未知收获物图片');const image=sheets.get(a.file);if(!image)return;
 const [sx,sy,w,h]=a.rect,scale=size/Math.max(w,h);c.drawImage(image,sx,sy,w,h,x-w*scale/2,y-h*scale/2,w*scale,h*scale);
}
// 验收读取正式图集缓存与像素预算，昼夜不新增位图副本。
export function farmArtBudget(){return {sheets:sheets.size,pixels:[...sheets.values()].reduce((n,i)=>n+i.naturalWidth*i.naturalHeight,0),maxSheets:manifest.runtimeFiles.length};}
// 地下天然草药直接复用正式作物图集与茎叶弯曲，绝不复制图片或制造地表田块。
export function drawNaturalFarmCrop(c,index,x,y,time,phase,night=false,reduced=false,stage=2){
 const a=manifest.crops[`crop-${index}-${stage}`],image=a&&sheets.get(a.file);if(!a||!image)throw Error('地下草药所需作物图集尚未加载或缺失');
 const size=FARM_CROP_SIZE[stage],scale=Math.min(size.width/a.rect[2],size.height/a.rect[3]);
 c.save();if(night)c.globalAlpha*=.82;drawGrowingCrop(c,image,a.rect,x,y,a.rect[2]*scale,a.rect[3]*scale,{time:reduced?0:time,phase,reduced},stage,1);c.restore();
}
// 实景土地、作物、快递站与独立农具共享正式世界镜头。
import {FARM_DELIVERY,FARM_SEED_SHOP,FARM_GARDEN,FARM_PLOT_SHAPE,farmPosition} from '../config/farm.js';
import {farmWorking} from '../core/farm.js';
import {nearest,visibleBodies} from '../world/coordinates.js';
// 两个世界与其故事现场共用永久田块，仅独立副本隔离土地。
export function farmVisible(game){return ['forest','jiuzhaigou'].includes(game.mapId)&&!game.realm;}
// 土壤跟随地图镜像，未开垦位置显示小圆点；已有田块的选择提示由上层热点负责。
export function drawFarmGround(c,game,view){
 if(!farmVisible(game))return;drawProductionGround(c,game,view);c.save();c.lineWidth=1.5;
 for(const p of visibleBodies(game.progress.farm.plots.filter(p=>p.mapId===game.mapId),view,60)){
  const {width,height,radius}=FARM_PLOT_SHAPE;
  c.beginPath();c.roundRect(p.x-width/2,p.y-height/2,width,height,radius);c.fillStyle=p.watered?'#594f40':'#806047';c.fill();c.strokeStyle=p.watered?'#4f5944':'#4c6343';c.stroke();c.strokeStyle=p.watered?'#7d795b':'#b69567';
  for(let n=0;n<3;n++){c.beginPath();c.moveTo(p.x-18,p.y-10+n*10);c.lineTo(p.x+18,p.y-10+n*10);c.stroke();}
 }
 const reference={x:view.x+view.w/2,y:view.y+view.h/2};
 const pending=[game.farmWork?.job,...(game.farmWork?.queue||[])].filter(j=>j?.point?.mapId===game.mapId);
 if(farmWorking(game)&&game.farmCursor&&game.farmWork.tool==='hoe'&&!pending.some(j=>j.action==='dig'))pending.push({point:game.farmCursor});
 // 开垦目标尚无地块热点，直接画清楚的圆点；已有田格的排队圆点在作物上层显示。
 for(const j of pending){
  if(j.action&&j.action!=='dig')continue;
  drawFarmTarget(c,nearest(j.point,reference));
 }c.restore();
}
// 奶油色小圆点配森林绿边缘，开垦与已有田格队列同样清晰。
function drawFarmTarget(c,p){
 c.setLineDash([]);c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);
 c.fillStyle='#fff4b5';c.fill();c.strokeStyle='#294b35';c.lineWidth=2;c.stroke();
}
// 田牌以杆底为锚点参与实体排序，土壤留在地面层，前后人物与作物遵守同一遮挡关系。
export function drawCampFarmSign(c,item){
 c.save();c.translate(item.x,item.y);c.lineWidth=1.5;c.fillStyle='#715b43';c.fillRect(-3,-74,6,74);c.fillStyle='#eee2ae';c.strokeStyle='#715b43';c.beginPath();c.roundRect(-58,-91,116,24,5);c.fill();c.stroke();c.fillStyle='#34543b';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('营地小田 · 锄地',0,-74);c.restore();
}
// 作物、田牌和快递柜台都按脚底排序，允许人物走到前后形成真实遮挡。
export function farmObjects(game){
 if(!farmVisible(game))return [];
 return [...productionObjects(game),...game.progress.farm.plots.filter(p=>p.mapId===game.mapId&&p.crop!==null).map(plot=>({...farmPosition(plot),type:'farm-crop',plot})),...(game.mapId==='forest'?[{...FARM_SEED_SHOP,type:'seed-shop'},{x:FARM_GARDEN.x-90,y:598,type:'farm-sign'},{...FARM_DELIVERY,type:'farm-delivery',parcels:game.progress.farm.delivery.parcels.length}]:[])];
}
// 三阶段保持宽高比例和固定根部，过渡期间茎叶逐渐长成并局部轻摆。
export function drawFarmCrop(c,item,time=0,reduced=false,now=Date.now(),boosts=[],zoom=1){
 const boost=boosts.find(b=>b.id===item.plot.id&&b.crop===item.plot.crop&&b.plantedAt===item.plot.plantedAt&&b.readyAt===item.plot.readyAt);
 const visual=sampleCropGrowth(item.plot,now,time,reduced,boost);
 for(const layer of visual.layers){const a=manifest.crops[`crop-${item.plot.crop}-${layer.stage}`],image=sheets.get(a.file);if(!image)return;
  const size=FARM_CROP_SIZE[layer.stage],scale=Math.min(size.width/a.rect[2],size.height/a.rect[3])*layer.scale;
  c.save();c.globalAlpha*=layer.alpha;drawGrowingCrop(c,image,a.rect,item.x,item.y+5,a.rect[2]*scale,a.rect[3]*scale,visual,layer.stage,zoom);c.restore();
 }
 drawCropChange(c,item,visual);
}
// 木棚、信封牌与包裹架组成快递站，柜台前保持通行，无额外位图缓存。
export function drawFarmDelivery(c,item){
 c.save();c.translate(item.x,item.y);c.lineWidth=2.2;c.strokeStyle='#49674a';
 c.fillStyle='#294c3c28';c.beginPath();c.ellipse(4,5,59,13,0,0,Math.PI*2);c.fill();
 c.fillStyle='#b48b58';for(const x of [-44,39]){c.beginPath();c.roundRect(x,-72,7,78,2);c.fill();c.stroke();}
 c.fillStyle='#8da96f';c.beginPath();c.moveTo(-58,-69);c.lineTo(-43,-94);c.lineTo(42,-94);c.lineTo(58,-69);c.closePath();c.fill();c.stroke();c.fillStyle='#e0cb8b';c.fillRect(-55,-71,110,7);c.strokeRect(-55,-71,110,7);
 c.fillStyle='#efdba9';c.beginPath();c.roundRect(-45,-32,90,37,5);c.fill();c.stroke();c.fillStyle='#d4b67b';c.fillRect(-48,-34,96,9);c.strokeRect(-48,-34,96,9);
 c.fillStyle='#f5edcc';c.beginPath();c.roundRect(-27,-63,54,25,4);c.fill();c.stroke();c.beginPath();c.moveTo(-22,-58);c.lineTo(0,-45);c.lineTo(22,-58);c.stroke();
 c.fillStyle='#3e6044';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('种子快递站',0,-7);
 if(item.parcels){c.fillStyle='#d5b070';c.fillRect(-36,-51,22,17);c.strokeRect(-36,-51,22,17);c.strokeStyle='#f6e2ab';c.beginPath();c.moveTo(-25,-51);c.lineTo(-25,-34);c.stroke();c.fillStyle='#f8d782';c.beginPath();c.arc(38,-82,12,0,Math.PI*2);c.fill();c.fillStyle='#385840';c.font='bold 12px sans-serif';c.fillText(String(item.parcels),38,-78);}
 c.restore();
}

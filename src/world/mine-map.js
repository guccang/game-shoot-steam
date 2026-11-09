// 地下地图仅消费已保存的探索与设施记录，不提前揭露天然洞厅。
import {MINING,mineKey,mineFreightCell} from '../config/mining.js';
import {mineCellArea,mineTerrain} from '../config/mine-ecology.js';
// 格子键统一解码，避免显示文案参与坐标判断。
function cellOf(key){const [x,y]=key.split(',').map(Number);return {x,y,key};}
// 快照构建只发生在打开地图时，读图不会增加开发率或修改存档。
export function buildMineMapModel(layer,player,depth=1){
 const keys=new Set(Object.keys(layer.dug).filter(k=>layer.dug[k]));
 for(const field of ['rails','bridges','decor'])for(const key of Object.keys(layer[field]||{}))if(layer[field][key])keys.add(key);
 const cells=[],known=new Map(),rails=new Set();
 for(const key of keys){const cell=cellOf(key);if(!Number.isSafeInteger(cell.x)||!Number.isSafeInteger(cell.y)||key!==mineKey(cell)||!mineCellArea(cell,layer))continue;
  const t=mineTerrain(cell,layer),item={...cell,water:t.water&&!layer.bridges[key],rail:!!layer.rails[key]};cells.push(item);known.set(key,item);if(item.rail)rails.add(key);
 }
 const position={x:(player.x-MINING.home.x)/MINING.tile,y:(player.y-MINING.home.y)/MINING.tile},segments=[];
 for(const key of rails){const a=known.get(key);a.degree=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>rails.has(mineKey({x:a.x+dx,y:a.y+dy}))).length;for(const [dx,dy] of [[1,0],[0,1]]){const b=known.get(mineKey({x:a.x+dx,y:a.y+dy}));if(b?.rail){segments.push({a,b});(a.links??=[]).push(b);}}}
 const markers=[];
 if(depth===1&&Number.isInteger(layer.depotRow)){const cell=mineFreightCell(layer,depth);markers.push({...cell,key:mineKey(cell),name:'仓库升井',kind:'depot'});}
 if(depth===1&&known.has('0,0'))markers.push({...cellOf('0,0'),name:'小屋',kind:'home'});
 if(layer.entry&&!(depth===1&&layer.entry==='0,0')&&known.has(layer.entry))markers.push({...cellOf(layer.entry),name:'上层',kind:'entry'});
 if(layer.descent&&known.has(layer.descent))markers.push({...cellOf(layer.descent),name:'下层',kind:'descent'});
 for(const [i,key] of (layer.shafts||[]).entries())if(known.has(key))markers.push({...cellOf(key),name:'洞口'+(i+1),kind:'shaft'});
 const bounds={left:position.x-.5,right:position.x+.5,top:position.y-.5,bottom:position.y+.5};
 for(const cell of [...cells,...markers]){bounds.left=Math.min(bounds.left,cell.x-.5);bounds.right=Math.max(bounds.right,cell.x+.5);bounds.top=Math.min(bounds.top,cell.y-.5);bounds.bottom=Math.max(bounds.bottom,cell.y+.5);}
 return {depth,cells,rails:[...rails].map(k=>known.get(k)),segments,markers,position,bounds};
}
// 默认适配全部已探索区域，极小开局也保留足够上下文。
export function fitMineMap(model,width,height){
 const b=model.bounds,scale=Math.max(.01,Math.min(32,(width-48)/Math.max(8,b.right-b.left+2),(height-48)/Math.max(8,b.bottom-b.top+2)));
 return {x:(b.left+b.right)/2,y:(b.top+b.bottom)/2,scale,minScale:scale/2};
}
// 拖动保留一部分探索区在视野内，防止把地图完全拖丢。
export function clampMineMap(view,model,width,height){
 const b=model.bounds,padX=width/view.scale*.25,padY=height/view.scale*.25;
 view.x=Math.max(b.left-padX,Math.min(b.right+padX,view.x));view.y=Math.max(b.top-padY,Math.min(b.bottom+padY,view.y));return view;
}
// 缩放以手指或鼠标位置为中心，世界点保持在同一屏幕位置。
export function zoomMineMap(view,factor,px,py,width,height){
 const scale=Math.max(view.minScale,Math.min(64,view.scale*factor)),x=view.x+(px-width/2)/view.scale,y=view.y+(py-height/2)/view.scale;
 view.x=x-(px-width/2)/scale;view.y=y-(py-height/2)/scale;view.scale=scale;return view;
}

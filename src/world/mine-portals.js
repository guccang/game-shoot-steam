// 地下点击与候停共用入口目录，层间通道只包含已开通记录，不在点击时扣款。
import {minePoint,mineFreightCell,mineKey} from '../config/mining.js';
import {mineEntrances} from './mine-entrances.js';
// 上下行重叠时分开点击牌，实际抵达仍在原通道格中央。
export function minePortals(layer,depth=1){
 // 网格键还原沿用矿区原点，点击牌的偏移不改变真实通道落点。
 const at=key=>minePoint(Object.fromEntries(key.split(',').map((n,i)=>[i?'y':'x',Number(n)])));
 const portals=[{id:'up',key:layer.entry,...at(layer.entry),label:depth===1?'返回小屋':'返回上一层',direction:-1}];
 if(depth===1){const p=mineFreightCell(layer,1);portals.push({id:'depot',key:mineKey(p),...minePoint(p),label:'返回仓库'});for(const s of mineEntrances(layer))portals.push({...s,id:'shaft:'+s.key,label:`矿洞 ${s.number} · 返回地面`});}
 if(layer.descent)portals.push({id:'down',key:layer.descent,...at(layer.descent),label:'进入下一层',direction:1});
 return portals.map(p=>({...p,hitX:p.x+(layer.descent===layer.entry&&['up','down'].includes(p.id)?p.id==='up'?-34:34:0),hitY:p.y-8}));
}

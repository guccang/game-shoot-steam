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
 const placed=[];
 return portals.map(p=>{
  // 同格上下行分置两侧，其余统一右侧；牌子离开梯井、轨道中心和正前方通道。
  const side=layer.descent===layer.entry&&p.id==='up'?-1:1;
  const signText=p.id==='up'?(depth===1?'↑ 小屋':'↑ '+(depth-1)+'层'):p.id==='down'?'↓ '+(depth+1)+'层':p.id==='depot'?'↑ 仓库':'↑ 地面·'+p.number;
  // 候选侧牌避开所有梯井和已放置牌面，相邻横向入口也不会被邻居的牌子挡住。
  const width=Math.max(68,signText.length*11+16),candidates=[];
  for(const dy of [-44,0,44,-88,88])for(const dx of [side*82,-side*82])candidates.push({x:p.x+dx,y:p.y+dy});
  const spot=candidates.find(c=>portals.every(o=>Math.abs(c.x-o.x)>=width/2+34||c.y+21<=o.y-34||c.y-12>=o.y+34)&&placed.every(o=>Math.abs(c.x-o.x)>=(width+o.width)/2+6||Math.abs(c.y-o.y)>=44))||{x:p.x+side*150,y:p.y-44};
  placed.push({...spot,width});
  return {...p,hitX:p.x+(layer.descent===layer.entry&&['up','down'].includes(p.id)?p.id==='up'?-34:34:0),hitY:p.y-8,signX:spot.x,signY:spot.y,signText};
 });
}

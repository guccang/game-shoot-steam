// 自然景观组合器：地貌携带草地、沙岸、成组摆件与萤火虫栖息地，数据可序列化并按种子复现。
import { NATURAL_TERRAIN, TERRAIN_RESERVES, touchesLandform } from './natural-terrain.js';
import { WORLD, delta, canonical } from './coordinates.js';
import { pathDistance } from './paths.js';
import { isWaterBlocked } from './river-geometry.js';
import { beachLobe } from './landscape-variants.js';
import { REALM_ENTRANCES } from './realm-entrances.js';

// 独立细节噪声不消耗战斗随机数，移动镜头和刷新存档不会重新洗牌景点组合。
function noise(seed, index) {
  const n = Math.sin(seed * 1.17 + index * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// 草地和摆件避让现有道路、河水、营地建筑与秘境入口，确保原活动区持续开放。
function safeGround(x, y, margin, reserved) {
  if (x < margin || y < margin || x > WORLD.width-margin || y > WORLD.height-margin ||
      pathDistance(x,y) < 38+margin || isWaterBlocked(x,y,margin)) return false;
  if (reserved.some(r => x > r.x-margin && x < r.x+r.w+margin && y > r.y-margin && y < r.y+r.h+margin)) return false;
  return !REALM_ENTRANCES.some(e => Math.abs(x-e.x)<e.width/2+margin && y>e.y-e.height-margin && y<e.y+85+margin);
}

// 只缩回会侵占保护带的轮廓点，不平移水界，也不为了景观面积占用通路。
function safeEdge(item, point, reserved) {
  let p = { ...point };
  for (let i=0; i<12 && !safeGround(item.x+p.x,item.y+p.y,5,reserved); i++)
    p = { x:p.x*.92, y:p.y*.92 };
  return p;
}

// 组合轮廓同时包含大色块草地与单侧宽沙滩，水面本身继续使用原地貌的碰撞轮廓。
export function generateLandscapeCompositions(terrain = NATURAL_TERRAIN, { reserved = TERRAIN_RESERVES } = {}) {
  const sites = [], props = [], habitats = [];
  for (const [index,item] of terrain.obstacles.entries()) {
    const seed = terrain.seed+index*173, lake = item.kind==='lake';
    const beachAngle = index%2 ? 2.05 : .95, beachDepth = 105+noise(seed,0)*25;
    const meadow = Array.from({length:64},(_,i)=>{
      const a=i/64*Math.PI*2, r=1+.14*Math.sin(a*3+item.phase)+.06*Math.sin(a*5-item.phase);
      return safeEdge(item,{x:Math.cos(a)*(item.rx+(lake?145:110))*r-10,
        y:Math.sin(a)*(item.ry+(lake?140:90))*r+17},reserved);
    });
    const beach = lake ? item.outline.map((p,i)=>{
      const a=i/item.outline.length*Math.PI*2, lobe=beachLobe(a-beachAngle,item.beachVariant);
      const depth=9+beachDepth*lobe*(.88+.12*Math.sin(a*5+item.phase));
      const radius=Math.max(1,Math.hypot(p.x,p.y));
      return safeEdge(item,{x:p.x*(1+depth/radius),y:p.y*(1+depth/radius)},reserved);
    }) : null;
    const site={id:item.id,group:item.group,variant:item.variant,beachVariant:item.beachVariant,forestVariant:item.forestVariant,kind:item.kind,x:item.x,y:item.y,meadow,beach,beachAngle,beachDepth,
      bounds:{x:0,y:0,w:0,h:0}};
    const edges=[...meadow,...(beach||[])];
    site.bounds={x:item.x+Math.min(...edges.map(p=>p.x))-36,y:item.y+Math.min(...edges.map(p=>p.y))-45,
      w:Math.max(...edges.map(p=>p.x))-Math.min(...edges.map(p=>p.x))+72,
      h:Math.max(...edges.map(p=>p.y))-Math.min(...edges.map(p=>p.y))+90};
    sites.push(site);
    // 每处只安排几个不对称组团，宽沙滩中间留空，花丛集中在草沙交界与山脚两翼。
    const groups=lake
      ? [[3.65,'flowers',42],[4.12,'flowers',55],[5.1,'flowers',46],[2.95,'flowers',51],
        [beachAngle-.72,'flowers',30],[beachAngle+.83,'flowers',27],
        [4.55,'reeds',20],[3.25,'reeds',20],[5.7,'reeds',19],
        [2.5,'stones',23],[5.9,'stones',27],[beachAngle-.53,'driftwood',-30],
        [beachAngle+.63,'bench',-8]]
      : [[.17,'stones',27],[.48,'flowers',50],[1.05,'flowers',49],[2.03,'flowers',40],
        [2.63,'flowers',42],[3.15,'stones',24],[3.65,'flowers',34],[5.7,'reeds',24]];
    for(const [n,[a,kind,offset]] of groups.entries()) {
      const j=((Math.round(a/(Math.PI*2)*item.outline.length)%item.outline.length)+item.outline.length)%item.outline.length;
      const edge=lake&&Math.cos(a-beachAngle)>0 ? beach[j] : item.outline[j];
      const length=Math.max(1,Math.hypot(edge.x,edge.y));
      let x=item.x+edge.x*(1+offset/length),y=item.y+edge.y*(1+offset/length);
      // 凹岸或扁山的径向距离不等于最近边距，向外轻移直到花石真正落在干地。
      for(let attempt=1;attempt<=10&&terrain.obstacles.some(o=>touchesLandform(o,x,y,23));attempt++) {
        x=item.x+edge.x*(1+(offset+attempt*10)/length);
        y=item.y+edge.y*(1+(offset+attempt*10)/length);
      }
      if(!safeGround(x,y,26,reserved)||terrain.obstacles.some(o=>touchesLandform(o,x,y,23)))continue;
      const prop={type:'scenery',kind,x,y,size:.76+noise(seed,n+1)*.28,site:item.id};
      props.push(prop);
      // 花草局部再错开一小簇，保留从山脚到草场的疏密过渡，不沿轮廓均匀描一整圈。
      if(kind==='flowers'&&n%2===0) {
        const x2=x+28,y2=y+17;
        if(safeGround(x2,y2,24,reserved)&&!terrain.obstacles.some(o=>touchesLandform(o,x2,y2,24)))
          props.push({...prop,x:x2,y:y2,size:prop.size*.68});
      }
      if(lake&&kind==='flowers'&&[0,4,5].includes(n))habitats.push({id:`${item.id}-glade-${n}`,x,y});
    }
  }
  // 同组山湖以重叠草坡衔接；查询包围范围也供图库和未来地图编辑器直接预览整组。
  const groups=[...new Set(sites.map(s=>s.group))].map(id=>{
    const members=sites.filter(s=>s.group===id);
    const edges=[...members.map(s=>s.bounds),...terrain.obstacles.filter(o=>o.group===id).map(o=>o.visualBounds)];
    const x=Math.min(...edges.map(b=>b.x)),y=Math.min(...edges.map(b=>b.y));
    return {id,members:members.map(s=>s.id),forest:members[0].forestVariant,
      bounds:{x,y,w:Math.max(...edges.map(b=>b.x+b.w))-x,h:Math.max(...edges.map(b=>b.y+b.h))-y}};
  });
  return {version:2,seed:terrain.seed,sites,props,habitats,groups};
}

export const LANDSCAPES = generateLandscapeCompositions();

// 查询可走干沙供随机草花避让，避免把大沙滩又盖回普通草地材质。
export function inLandscapeBeach(x,y) {
  const p=canonical({x,y});
  return LANDSCAPES.sites.some(site=>{
    if(!site.beach)return false;
    const b=site.bounds;
    if(p.x<b.x||p.x>b.x+b.w||p.y<b.y||p.y>b.y+b.h)return false;
    let inside=false;
    for(let i=0,j=site.beach.length-1;i<site.beach.length;j=i++) {
      const a=site.beach[i],b=site.beach[j],px=p.x-site.x,py=p.y-site.y;
      if((a.y>py)!==(b.y>py)&&px<(b.x-a.x)*(py-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  });
}

// 只让高树避开沙滩及精选小景，外围树林继续保留，低矮花草不新增碰撞。
export function coversLandscape(x,y) {
  if([y-120,y-60,y].some(sy=>inLandscapeBeach(x,sy)))return true;
  return LANDSCAPES.props.some(p=>Math.abs(delta(x-p.x,WORLD.width))<58 &&
    delta(y-p.y,WORLD.height)>-15 && delta(y-p.y,WORLD.height)<145);
}

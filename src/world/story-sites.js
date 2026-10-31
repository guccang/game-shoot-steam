// 第一章固定地标与巡护通路；交互、导航提示和正式绘制共用世界坐标。
import {STORY_SITES,STORY_CHAPTER} from '../config/story.js';
import {planQuestRoute} from '../physics/quest-route.js';
import {settlementAt} from './settlements.js';
import {SpatialGrid} from './spatial-grid.js';
export {STORY_SITES};
// 到线段的距离用于明确的任务走廊，不改变原森林地形和树木存档。
export function storySegmentDistance(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
// 临时巡护通路只移除阻塞道路的采集树，山湖水界仍由正式碰撞检查。
export function storyTrees(trees,def=STORY_CHAPTER) {
  const world=def.world;
  return trees.filter(t=>!Object.entries(world.sites).some(([key,p])=>Math.hypot(t.x-p.x,t.y-p.y)<(world.clearances[key]??world.defaultClearance)+t.radius)
    &&!world.approaches.some(a=>a.offsets.some(([x,y])=>{const p=world.sites[a.site];return storySegmentDistance(t,p,{x:p.x+x,y:p.y+y})<a.clearance+t.radius;}))
    &&!world.paths.some(path=>path.sites.slice(1).some((key,j)=>storySegmentDistance(t,world.sites[path.sites[j]],world.sites[key])<path.clearance+t.radius)));
}
// 使用正式地形边界验证路线采样；无法通行时明确拒绝进入章节。
export function validateStorySites(trees, blocked,def=STORY_CHAPTER) {
  const world=def.world,cfg=world.validation,issues=[];
  // 远行章节允许绕山、绕桥与穿门；验收实际可走路线，不再要求两地点之间直线无障碍。
  if(cfg.navigation){
    const index=new SpatialGrid(trees);
    for(const path of world.paths)for(let i=1;i<path.sites.length;i++){
      const from=world.sites[path.sites[i-1]],to=world.sites[path.sites[i]];
      if(!planQuestRoute({...from,mapId:def.mapId,amphibious:path.travel==='water',flying:path.travel==='air',worldBarriers:world.barriers||[]},to,index,16000).reachable)issues.push(`${path.sites[i-1]}→${path.sites[i]}`);
    }
    for(const node of Object.values(def.nodes)){
      const sites=node.task.type==='route'?Object.values(def.routes).flatMap(r=>r.sites.filter((_,i)=>r.counts[i]>0)):
        ['wave','defense'].includes(node.task.type)?[node.task.site]:node.task.type==='boss'?[def.encounters.bosses[node.task.boss].site]:[];
      const radius=node.task.type==='boss'?def.encounters.bosses[node.task.boss].arena.radius:def.encounters.arena.radius;
      for(const key of sites)if(settlementAt(world.sites[key],radius))issues.push(`战斗场侵入安全区：${key}`);
    }
    return [...new Set(issues)];
  }
  for(const path of world.paths)for(let i=1;i<path.sites.length;i++){
    const keys=path.sites,a=world.sites[keys[i-1]],b=world.sites[keys[i]],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/cfg.step);
    const distance=Math.hypot(b.x-a.x,b.y-a.y),half=path.walkHalf;
    for(let j=0;j<=n;j++)for(const offset of [-half+cfg.playerRadius,0,half-cfg.playerRadius]){
      const p={x:a.x+(b.x-a.x)*j/n-(b.y-a.y)/distance*offset,y:a.y+(b.y-a.y)*j/n+(b.x-a.x)/distance*offset,mapId:def.mapId,amphibious:path.travel==='water'};
      if(path.travel!=='air'&&blocked(p.x,p.y,cfg.playerRadius,trees,p)) {issues.push(`${keys[i-1]}→${keys[i]}`);break;}}
  }
  // 领主空地按配置的交叉通道采样，仍调用正式地形碰撞。
  for(const c of cfg.crosses){const center=world.sites[c.site];
    for(let d=-c.half;d<=c.half;d+=cfg.step)for(const [x,y] of [[d,0],[0,d]])if(blocked(center.x+x,center.y+y,c.radius,trees))issues.push(c.label);}
  return [...new Set(issues)];
}

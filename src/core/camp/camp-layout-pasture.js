// 牛栏搬迁只带走栏内闲置耕牛，外出和归栏中的牛保留当前位置。
import {CAMP_BUILDINGS,campBuildingPosition} from '../../config/camp-layout.js';
import {PASTURE_BASE,oxFoot} from '../../config/pasture.js';
import {nearest,worldDistance} from '../../world/coordinates.js';
// 在候选存档上迁移，保存失败不会修改真实牛的位置。
export function relocatePastureAnimals(game,next){
 const base=CAMP_BUILDINGS.find(b=>b.id==='pasture'),before=campBuildingPosition(game.progress.campLayout,base),after=campBuildingPosition(next.campLayout,base);
 if(worldDistance(before,after)<1)return false;
 const farm=next.farm,site=farm.oxSite;
 if(site?.mapId==='forest'&&!farm.oxReturn&&!game.oxArrival&&game.farmWork?.tool!=='ox'){
  const foot=nearest(oxFoot(site),before),centerY=before.y-PASTURE_BASE.halfHeight;
  if(Math.abs(foot.x-before.x)<PASTURE_BASE.halfWidth&&Math.abs(foot.y-centerY)<PASTURE_BASE.halfHeight){site.x+=after.x-before.x;site.y+=after.y-before.y;}
 }
 return true;
}

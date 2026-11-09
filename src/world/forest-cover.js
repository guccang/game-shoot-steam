// 生态面积采用互斥地表分类，湖山精确边界优先，营地道路留白先于植被分区。
import {WORLD,wrap,nearest} from './coordinates.js';
import {forestHabitat} from './forest-habitats.js';
import {isLakeWater,isMountainArea} from './natural-terrain.js';
import {isWaterScenery} from './river-geometry.js';
import {pathDistance} from './paths.js';
import {monsterCampClearing} from '../config/monster-camps.js';
import {TOWN_LAYOUT} from '../config/town-layout.js';
import {FOREST_COVER_THRESHOLDS} from '../config/terrain-coverage.js';

// 连续周期地势用于稳定排序，避免大片零强度草甸在分位点同时翻转。
export function coverPotential(x,y){
 const u=wrap(x,WORLD.width)*2*Math.PI/WORLD.width,v=wrap(y,WORLD.height)*2*Math.PI/WORLD.height;
 return {forest:forestHabitat(x,y).strength+.12*Math.sin(4*u+2*v)+.07*Math.cos(7*v-u),meadow:Math.sin(3*u-v)+.6*Math.cos(2*v+u)+.2*Math.sin(7*u+4*v)};
}
// 保护公共活动空间，河道记入其他区域，不冒充湖泊覆盖率。
export function coverReserved(x,y){
 const p=nearest({x,y},{x:0,y:700}),b=TOWN_LAYOUT.bounds;
 return p.x>b.left-100&&p.x<b.right+100&&p.y>b.top-150&&p.y<2200||isWaterScenery(x,y)||pathDistance(x,y)<48||monsterCampClearing(x,y);
}
// 互斥分类供统计、植被、地表与地图共用；林地面积不等于树冠投影面积。
export function forestCoverAt(x,y){
 if(isLakeWater(x,y))return 'lake';
 if(isMountainArea(x,y,0))return 'mountain';
 if(coverReserved(x,y))return 'other';
 const score=coverPotential(x,y);
 return score.forest>=FOREST_COVER_THRESHOLDS.forest?'forest':score.meadow>=FOREST_COVER_THRESHOLDS.meadow?'meadow':'other';
}

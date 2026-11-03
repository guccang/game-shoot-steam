// 首批地面地下生产参数；配方、容量和实际行动加成集中配置。
import {FARM_CROPS} from './farm.js';
export const PRODUCTION={oreGoal:12,maxSprinklers:32,maxStock:999,keepMax:20,mealDigs:100,mealReduction:.2,juiceSeconds:180,juiceSpeed:1.15,oilSeconds:180,oilSpeed:1.2,lessonDigs:20};
export const PRODUCTION_BUILDINGS={sprinkler:{name:'简易洒水器',ore:12,wood:16},bench:{name:'农产加工台',ore:8,wood:20}};
export const PRODUCTION_RECIPES={meal:{name:'矿工便当',count:3,description:'接下来100次成功开掘，耗时降低20%'},juice:{name:'探路果饮',count:3,description:'地下实际步行180秒，速度提高15%'},oil:{name:'植物油',count:3,description:'一辆矿车实际行驶180秒，速度提高20%'}};
// 稳定作物ID映射既有库存索引，不以中文显示名关联数据。
export function productionCrop(id){return FARM_CROPS.findIndex(c=>c.id===id);}
// 覆盖规则、预览和喷水采用同一田格尺度，周围两层为5×5去掉中心与四角，共20格。
export const SPRINKLER={radius:2,diagonalLimit:3,cellWidth:56,cellHeight:52,spraySeconds:2.4};
// 排除设备自身所在格，保留两层20个相邻田格中心。
export const SPRINKLER_OFFSETS=Array.from({length:25},(_,i)=>[i%5-2,Math.floor(i/5)-2]).filter(([x,y])=>(x||y)&&Math.abs(x)+Math.abs(y)<=SPRINKLER.diagonalLimit).map(([x,y])=>[x*SPRINKLER.cellWidth,y*SPRINKLER.cellHeight]);

// 开掘逻辑、锄头动作与进度环共用加速后的单次时长。
export function productionDigSeconds(progress,base){return base*(progress.production?.effects.meal>0?1-PRODUCTION.mealReduction:1);}

// 二层去角覆盖轮廓，供地面预览使用，与实际坐标判定同源。
export const SPRINKLER_OUTLINE=[[-1,-2],[1,-2],[2,-1],[2,1],[1,2],[-1,2],[-2,1],[-2,-1]];
// 旋转喷水沿射线到达去角轮廓，避免仍只扫到原12格圆形边缘。
export function sprinklerReach(angle){
 const x=Math.abs(Math.cos(angle)),y=Math.abs(Math.sin(angle));
 return Math.min(SPRINKLER.radius/Math.max(x,y),SPRINKLER.diagonalLimit/(x+y));
}

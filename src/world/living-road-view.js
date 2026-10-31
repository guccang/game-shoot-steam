// 道路整体平移到视口内的周期副本，禁止逐顶点选择不同镜像产生假路。
import {LIVING_ROADS} from '../config/living-world.js';
import {WORLD} from './coordinates.js';

// 使用整条折线的包围盒裁剪；支持地图接缝、负坐标以及超过一张地图的视野。
export function visibleLivingRoads(view){
  const result=[];
  for(const road of LIVING_ROADS){
    const xs=road.map(p=>p.x),ys=road.map(p=>p.y),padding=28;
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    for(let tx=Math.ceil((view.x-padding-maxX)/WORLD.width);tx<=Math.floor((view.x+view.w+padding-minX)/WORLD.width);tx++)
      for(let ty=Math.ceil((view.y-padding-maxY)/WORLD.height);ty<=Math.floor((view.y+view.h+padding-minY)/WORLD.height);ty++)
        result.push(road.map(p=>({x:p.x+tx*WORLD.width,y:p.y+ty*WORLD.height})));
  }
  return result;
}

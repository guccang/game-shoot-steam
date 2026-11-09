// 地契投影到正式场景：未购地保留草地，正式围栏单独读取已购外边界。
import {CAMP_PLOTS,availableCampPlots,ownsCampPlot,ownsCampPoint} from '../config/camp-land.js';
import {nearest} from '../world/coordinates.js';
import {box,oval} from './primitives.js';
import {drawWorldSign} from './world-signs.js';
import {drawCampGrass} from './ground-depth.js';
// 室内与独立战斗场景不叠加地契图层。
export function campLandActive(game){return game.mapId==='forest'&&!game.story&&!game.realm&&!game.cottage&&!game.campDefense;}
// 实体白名单保留人、怪物、车辆、植物，隐藏未购地的建筑与常驻营业陈设。
export function campObjectVisible(game,item){
 if(!campLandActive(game)||ownsCampPoint(game.progress,item))return true;
 return ['settlement-fence','settlement-gate','player','enemy','boss','tree','landform','parked-vehicle','camp-land-sign','camp-land-stake','mechanical-cat','mechanical-spider'].includes(item.type)||item.type==='scenery'&&['flowers','stones','logs'].includes(item.kind);
}
// 相邻未购地显示扩建木牌，核心区保留营地建设入口。
export function campLandObjects(game){
 if(!campLandActive(game))return [];
 const objects=[{x:440,y:720,id:'core',type:'camp-land-sign',name:'营地建设'},...availableCampPlots(game.progress).map(p=>({...p.sign,id:p.id,type:'camp-land-sign',name:p.name}))];
 return objects;
}
// 覆盖未开发院落与铺路，复用两张小草地纹理；购买后的下一帧立即恢复原地面。
export function drawCampLandGround(c,game,view,night,season='summer'){
 if(!campLandActive(game))return;
 for(const plot of CAMP_PLOTS){if(ownsCampPlot(game.progress,plot.id))continue;
  const center=nearest({x:(plot.left+plot.right)/2,y:(plot.top+plot.bottom)/2},{x:view.x+view.w/2,y:view.y+view.h/2});
  const w=plot.right-plot.left,h=plot.bottom-plot.top,x=center.x-w/2,y=center.y-h/2;
  if(x>view.x+view.w||x+w<view.x||y>view.y+view.h||y+h<view.y)continue;
  c.save();drawCampGrass(c,{x,y,w,h},night,season);
  // 稀疏草簇采用固定位置，镜头移动不会闪烁或重新随机分布。
  for(let row=0;row<h;row+=92)for(let col=0;col<w;col+=104){const px=x+col+24+(row%3)*7,py=y+row+25;
   // 低矮林草只作装饰，疏密变化承接外围森林，保持通路开放。
   if((Math.round(row/92)*7+Math.round(col/104)*3)%11===3){oval(c,px+8,py+4,25,7,'#52764b20');for(const [dx,dy,rx,ry] of [[-11,-3,12,7],[5,-7,15,10],[19,-1,10,6]])oval(c,px+dx,py+dy,rx,ry,night>.5?'#71916e':'#9ab975','#6f965c',1.2);}}
  c.restore();
 }
}
// 木牌和界桩与角色共用脚底深度及夜色。
export function drawCampLandObject(c,item,night){
 c.save();c.translate(item.x,item.y);oval(c,3,3,item.type==='camp-land-sign'?20:6,3,'#31523e30');
 box(c,-3,-18,6,20,2,night>.5?'#a59470':'#c8ad7b','#41634b',1.5);
 if(item.type==='camp-land-sign'){box(c,-52,-54,104,38,5,night>.5?'#c4c39c':'#fff0c6','#41634b',2);drawWorldSign(c,(item.id==='core'?'':'扩建 · ')+item.name,0,-29);}
 c.restore();
}
// 地基无完整墙体和屋顶，与完工建筑形成明确结构差异。
export function drawCampFoundation(c,item,name,night){
 c.save();c.translate(item.x,item.y);const w=Math.min(150,item.width||110);
 oval(c,0,2,w*.5,12,night>.5?'#7e896c':'#c8c496');c.strokeStyle='#557050';c.lineWidth=2;c.setLineDash([7,6]);c.strokeRect(-w/2,-28,w,34);c.setLineDash([]);
 for(const x of [-w/2,w/2])for(const y of [-28,6])box(c,x-2,y-13,5,15,1,'#d7be87','#41634b',1.5);
 drawWorldSign(c,'建设 · '+name,0,-36);c.restore();
}

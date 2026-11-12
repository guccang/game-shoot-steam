// 地契投影到正式场景：未购地保留草地，正式围栏单独读取已购外边界。
import {CAMP_DIRECTIONS,campDirectionStatus,ownsCampPoint} from '../config/camp-land.js';
import {box,oval} from './primitives.js';
import {canvasFont} from './text-style.js';
import {drawWorldSign} from './world-signs.js';
// 室内与独立战斗场景不叠加地契图层。
export function campLandActive(game){return game.mapId==='forest'&&!game.story&&!game.realm&&!game.cottage&&!game.campDefense;}
// 实体白名单保留人、怪物、车辆、植物，隐藏未购地的建筑与常驻营业陈设。
export function campObjectVisible(game,item){
 // 接送车同层绘制主角和松伯，剧情车辆、站牌与交接物沿公共路线显示。
 if(item.type?.startsWith('arrival-')||!campLandActive(game)||ownsCampPoint(game.progress,item))return true;
 return ['settlement-fence','settlement-gate','player','enemy','boss','tree','landform','parked-vehicle','camp-land-sign','camp-land-stake','mechanical-cat','mechanical-spider'].includes(item.type)||item.type==='scenery'&&['flowers','stones','logs'].includes(item.kind);
}
// 相邻未购地显示扩建木牌，核心区保留营地建设入口。
export function campLandObjects(game){
 if(!campLandActive(game))return [];
 return CAMP_DIRECTIONS.map(d=>{
  const step=campDirectionStatus(game.progress,d);
  return {...d.sign,type:'camp-land-sign',id:d.id,name:d.name+'侧扩建',count:step.total-step.remaining+'/'+step.total,preview:step.next?'下次 · '+step.landmark:'已全部扩建'};
 });

}
// 木牌和界桩与角色共用脚底深度及夜色。
export function drawCampLandObject(c,item,night){
 c.save();c.translate(item.x,item.y);oval(c,3,3,item.type==='camp-land-sign'?20:6,3,'#31523e30');
 box(c,-3,-18,6,20,2,night>.5?'#a59470':'#c8ad7b','#41634b',1.5);
 if(item.type==='camp-land-sign'){
  box(c,-59,-64,118,49,5,night>.5?'#c4c39c':'#fff0c6','#41634b',2);
  c.textAlign='center';c.fillStyle='#374e3d';c.font=canvasFont(13);c.fillText(item.name+' '+item.count,0,-45);
  c.font=canvasFont(11);c.fillText(item.preview,0,-24);
 }
 c.restore();
}
// 地基无完整墙体和屋顶，与完工建筑形成明确结构差异。
export function drawCampFoundation(c,item,name,night){
 c.save();c.translate(item.x,item.y);const w=Math.min(150,item.width||110);
 oval(c,0,2,w*.5,12,night>.5?'#7e896c':'#c8c496');c.strokeStyle='#557050';c.lineWidth=2;c.setLineDash([7,6]);c.strokeRect(-w/2,-28,w,34);c.setLineDash([]);
 for(const x of [-w/2,w/2])for(const y of [-28,6])box(c,x-2,y-13,5,15,1,'#d7be87','#41634b',1.5);
 drawWorldSign(c,'建设 · '+name,0,-36);c.restore();
}

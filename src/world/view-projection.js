// 世界与视口共用投影；普通镜头保持北朝上，阳台提供观察方向与右侧轴。
export function worldPointToView(view,point){
 const zoom=view.zoom||1;
 if(!view.forward)return {x:(point.x-view.x)*zoom,y:(point.y-view.y)*zoom};
 const dx=point.x-view.anchor.x,dy=point.y-view.anchor.y;
 return {x:view.width/2+(dx*view.right.x+dy*view.right.y)*zoom,y:view.height-(dx*view.forward.x+dy*view.forward.y-view.near)*zoom};
}
// 天气落点从屏幕回到世界，保证闪电、雨雪与四向地面使用相同坐标。
export function viewPointToWorld(view,point){
 const zoom=view.zoom||1;
 if(!view.forward)return {x:view.x+point.x/zoom,y:view.y+point.y/zoom};
 const lateral=(point.x-view.width/2)/zoom,depth=view.near+(view.height-point.y)/zoom;
 return {x:view.anchor.x+view.right.x*lateral+view.forward.x*depth,y:view.anchor.y+view.right.y*lateral+view.forward.y*depth};
}

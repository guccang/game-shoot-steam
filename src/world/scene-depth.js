// 光照采样只读可见世界对象；投影和实体受光共用连续几何。
import {SCENE_DEPTH as D} from '../config/scene-depth.js';
const BUILDING_SIZES={'cat-home':[144,132],warehouse:[144,124],'warehouse-depot':[182,101],'furniture-shop':[136,120],'seed-shop':[114,110],'construction-company':[132,130],'ammo-shop':[144,128],industry:[180,135]};

// 已知实体建筑使用自己的底座和高度，标牌、人物与临时特效不参与建筑投影。
export function buildingShadowShape(item){
 const dims=BUILDING_SIZES[item.type]||(item.type==='scenery'&&['cottage','garage'].includes(item.kind)?[item.width||130,item.height||140]:null);
 if(!dims)return null;const size=item.size||1,w=dims[0]*size,h=dims[1]*size;
 return {x:item.x,y:item.y,w,h,dx:h*.31,dy:h*.19};
}

// 树影沿树高投向右下，树种改变冠影比例，脚底仍为原世界锚点。
export function treeShadowShape(tree){
 const s=tree.size||1,pine=['pine','cypress'].includes(tree.variant),length=D.treeLength*s;
 return {x:tree.x+D.sunX*length*.62,y:tree.y+D.sunY*length*.62,rx:D.treeWidth*s*(pine?.72:1),ry:D.treeDepth*s,length,s};
}
// 只把有实体占地的树干作为灯光遮挡物，柔边防止角色跨边界闪烁。
export function lightTransmission(point,light,trees=[]){
 const x=light.x+(light.offset||0),y=light.y,dx=point.x-x,dy=point.y-y,dd=dx*dx+dy*dy;
 if(dd<1)return 1;let transmission=1;
 for(const tree of trees){
  const t=((tree.x-x)*dx+(tree.y-y)*dy)/dd;if(t<=.02||t>=.98)continue;
  const distance=Math.hypot(tree.x-x-t*dx,tree.y-y-t*dy),r=9*(tree.size||1);
  transmission=Math.min(transmission,Math.max(.08,Math.min(1,(distance-r+4)/8)));
 }
 return transmission;
}
// 同一位置得到环境阴影、多个局部光的连续合成方向与日照权重，不修改游戏状态。
export function sampleSceneLight(point,environment={},trees=[],lights=[],buildings=[]){
 const night=Math.max(0,Math.min(1,environment.night||0));let shade=0,power=0,lx=0,ly=0;
 for(const tree of trees){const s=treeShadowShape(tree),d=Math.hypot((point.x-s.x)/s.rx,(point.y-s.y)/s.ry);shade=Math.max(shade,Math.max(0,Math.min(1,(1.15-d)*2.5)));}
 for(const b of buildings){const t=(point.y-b.y)/b.dy;if(t<0||t>1)continue;const side=Math.abs(point.x-b.x-b.dx*t)/(b.w*.5);shade=Math.max(shade,Math.max(0,Math.min(1,(1-side)*5,t*5,(1-t)*5)));}
 for(const light of lights){const dx=light.x+(light.offset||0)-point.x,dy=light.y-point.y,d=Math.hypot(dx,dy),falloff=Math.max(0,1-d/light.radius),value=(light.power??1)*falloff*falloff*lightTransmission(point,light,trees);power+=value;lx+=dx/(d||1)*value;ly+=dy/(d||1)*value;}
 const n=Math.hypot(D.sunX,D.sunY);
 return {night,shade:shade*(1-night),sun:(1-night)*(1-(environment.rain||0)*.65),power:Math.min(1,power),dx:power?lx/power:-D.sunX/n,dy:power?ly/power:-D.sunY/n};
}

// 雪场绑定循环世界格点和表现时钟，镜头只负责选择可见格点，不参与雪花运动。
import { WORLD, wrap } from './coordinates.js';
import { weatherNoise } from './precipitation.js';
export const SNOW_LAYERS = [
  { width:75,height:100,limit:128,radius:2.6,spread:1.2,alpha:.48 },
  { width:150,height:200,limit:36,radius:4.7,spread:2.1,alpha:.76 },
  { width:450,height:350,limit:3,radius:10.5,spread:4,alpha:.82 },
];
// 固定格点采样与视口尺寸完全无关；取模仅统一世界镜像种子，不用于屏幕回绕。
export function snowSample(column,row,layer,time) {
  const cfg=SNOW_LAYERS[layer],cx=wrap(column,WORLD.width/cfg.width),cy=wrap(row,WORLD.height/cfg.height);
  const seed=cx*37+cy*7919+layer*951,n=weatherNoise(seed);
  const period=layer===2?18:7+n*6,duration=layer===2?6:period;
  const phase=wrap(time+weatherNoise(seed+2)*period,period),progress=Math.min(1,phase/duration);
  const fade=phase>=duration?0:Math.min(1,progress*8,(1-progress)*8);
  return {id:`${layer}:${column}:${row}`,layer,seed,
    x:column*cfg.width+cfg.width*(.22+n*.56)+Math.sin(time*.55+n*12)*8+progress*8,
    y:row*cfg.height+progress*cfg.height,
    radius:cfg.radius+weatherNoise(seed+4)*cfg.spread,
    angle:n*6+time*(layer===0 ? .08 : .16),alpha:cfg.alpha*fade};
}
// 世界到屏幕统一使用完整位移与倍率；纯函数便于核对移动和缩放连续性。
export function projectSnow(sample,view) {
  const zoom=view.zoom||1;
  return {...sample,x:(sample.x-view.x)*zoom,y:(sample.y-view.y)*zoom,radius:sample.radius*zoom};
}
// 枚举视口周围固定格点；缩小视野只稀疏选取原索引，绝不重排已有雪花位置。
export function* visibleSnow(view,width,height,time) {
  const zoom=view.zoom||1,w=width/zoom,h=height/zoom,pad=16;
  for(let layer=0;layer<SNOW_LAYERS.length;layer++) {
    const cfg=SNOW_LAYERS[layer];
    const stride=Math.max(1,Math.ceil(Math.sqrt(w*h/(cfg.width*cfg.height*cfg.limit*(layer===2?2:.85)))));
    const left=Math.floor((view.x-pad)/cfg.width),right=Math.floor((view.x+w+pad)/cfg.width);
    const top=Math.floor((view.y-pad)/cfg.height),bottom=Math.floor((view.y+h+pad)/cfg.height);
    let count=0;
    for(let row=Math.ceil(top/stride)*stride;row<=bottom;row+=stride)
      for(let col=Math.ceil(left/stride)*stride;col<=right;col+=stride) {
        if(count>=cfg.limit)break;
        const sample=snowSample(col,row,layer,time);if(sample.alpha<=.001)continue;
        const screen=projectSnow(sample,view),r=screen.radius;
        if(screen.x+r<0||screen.x-r>width||screen.y+r<0||screen.y-r>height)continue;
        count++;yield screen;
      }
  }
}

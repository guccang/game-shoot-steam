// 白色鹅毛雪与少量晶体投影自世界雪场，所有尺寸均随镜头移动，中央战斗区域降低遮挡。
import { visibleSnow } from '../world/snowfall.js';
import { precipitationPresence } from '../world/precipitation.js';
// 共用六条主枝，较大雪花增加分叉；双层细线使雪地背景上仍可辨认。
export function drawSnowCrystal(c,radius,alpha,angle=0) {
  c.save();c.rotate(angle);c.lineCap='round';c.lineJoin='round';c.beginPath();
  for(let arm=0;arm<6;arm++) {
    const a=arm*Math.PI/3,dx=Math.cos(a),dy=Math.sin(a);
    c.moveTo(0,0);c.lineTo(dx*radius,dy*radius);
    if(radius>=3.5)for(const sign of [-1,1]) {
      const x=dx*radius*.58,y=dy*radius*.58,b=a+sign*Math.PI/3;
      c.moveTo(x,y);c.lineTo(x+Math.cos(b)*radius*.32,y+Math.sin(b)*radius*.32);
    }
  }
  c.globalAlpha=alpha*.48;c.strokeStyle='#739ba7';c.lineWidth=radius>7?2.3:1.7;c.stroke();
  c.globalAlpha=alpha;c.strokeStyle='#f5faf5';c.lineWidth=radius>7?1.15:.85;c.stroke();c.restore();
}
// 鹅毛雪以柔软团块和明亮雪芯表现，少量椭圆拼合替代昂贵模糊滤镜。
export function drawSnowTuft(c,radius,alpha,angle=0){
 c.save();c.rotate(angle);c.fillStyle='#f7fcff';c.globalAlpha=alpha*.22;c.beginPath();c.ellipse(0,0,radius*1.08,radius*.8,0,0,Math.PI*2);c.fill();
 c.globalAlpha=alpha;c.fillStyle='#ffffff';c.beginPath();c.ellipse(-radius*.18,0,radius*.76,radius*.57,-.22,0,Math.PI*2);c.ellipse(radius*.32,-radius*.13,radius*.49,radius*.42,.35,0,Math.PI*2);c.ellipse(radius*.12,radius*.27,radius*.48,radius*.35,-.3,0,Math.PI*2);c.fill();c.restore();
}
// 中心留出柔和低密度窗口，保护实际角色位置而非假定屏幕中心。
function visibility(x,y,focus,width,height) {
  const dx=x-(focus?.x??width*.5),dy=y-(focus?.y??height*.5);
  return .18+.82*Math.min(1,Math.max(0,(Math.hypot(dx,dy)-60)/95));
}
export class SnowRenderer {
  // 数量固定封顶，不维护增长的粒子数组。
  constructor() { this.count=0;this.largeCount=0;this.tuftCount=0; }
  // 使用表现时钟连续缓落，减少动态固定形态和位置。
  draw(c,time,width,height,view,intensity=0,night=0,reduced=false,focus=null) {
    this.count=0;this.largeCount=0;this.tuftCount=0;if(intensity<.01)return;
    const t=reduced?0:time,heavy=Math.max(0,Math.min(1,(intensity-.45)/.55));
    c.save();
    for(const flake of visibleSnow(view,width,height,t)) {
      const presence=precipitationPresence(intensity,flake.seed);
      if(presence<=0)continue;
      const soft=flake.layer===2||Math.abs(flake.seed)%5!==0;
      const alpha=Math.min(1,intensity*presence*flake.alpha*(1+heavy*.3))*(1-night*.05)*visibility(flake.x,flake.y,focus,width,height);
      c.save();c.translate(flake.x,flake.y);if(soft){drawSnowTuft(c,flake.radius*(1+heavy*.35),alpha,flake.angle);this.tuftCount++;}else drawSnowCrystal(c,flake.radius,alpha,flake.angle);c.restore();
      this.count++;if(flake.layer===2)this.largeCount++;
    }
    c.restore();
  }
  // 报告总数及近景数，验证不会以铺满画面增强雪感。
  stats() { return {count:this.count,limit:167,largeCount:this.largeCount,largeLimit:3,tuftCount:this.tuftCount}; }
}

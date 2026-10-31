// 秋叶从现有阔叶树冠缓慢旋落，只作环境点缀，不创建掉落物或改变树木数量。
import { weatherNoise } from '../world/precipitation.js';
import { nightColor } from './river.js';
export class FallingLeavesRenderer {
  // 每帧计数复位，叶片按树身份与时钟计算，不累计粒子。
  constructor() { this.count=0; }
  // 减少动态固定叶片；雨雪时降低叶片对比，避免叠加遮挡。
  draw(c,time,trees,season,night=0,reduced=false,player=null,weather='sun',strength=1) {
    this.count=0;if(season!=='autumn'||strength<=0)return;
    const t=reduced?0:time;
    for(const tree of trees) {
      if(this.count>=18)break;
      if(tree.hp<=0||['pine','cypress'].includes(tree.variant))continue;
      const seed=tree.id??tree.x+tree.y,n=weatherNoise(seed+91),phase=((t+n*12)%12+12)%12;
      if(phase>8)continue;
      const fall=phase/8,size=tree.size||1;
      const x=tree.x+(-17+fall*34+Math.sin(t*.9+n*8)*12)*size,y=tree.y+(-103+fall*108)*size;
      const near=player?Math.min(1,Math.hypot(x-player.x,y-player.y)/100):1;
      const alpha=Math.min(1,fall*5,(1-fall)*5)*(.2+.8*near)*(weather==='sun'||weather==='cloud' ? .7 : .35);
      c.save();c.translate(x,y);c.rotate(t*.7+n*6);c.scale((.45+Math.abs(Math.cos(t*1.3+n*6))*.55)*size,size);
      c.globalAlpha=alpha*strength;c.beginPath();c.moveTo(-5,0);c.quadraticCurveTo(-1,-4.5,5,0);c.quadraticCurveTo(1,4,-5,0);
      c.fillStyle=nightColor(n>.5?'#d1a15e':'#b98450',night);c.fill();
      c.strokeStyle=nightColor('#896d46',night);c.lineWidth=.7;c.beginPath();c.moveTo(-4,0);c.lineTo(4,0);c.stroke();c.restore();this.count++;
    }
  }
  // 落叶预算独立于雪花，便于诊断同屏负担。
  stats() {return {count:this.count,limit:18};}
}

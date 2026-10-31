// 团子王落地的局部胶环与圆润胶滴；单个复合特效，不分配粒子阵列。
import {oval,outline} from './primitives.js';

// 两圈错峰扩散，胶滴先抛起再摊平；减少动态只显示固定着地点。
export function drawDumplingImpact(c,p,age,reduced=false){
 const t=Math.max(0,Math.min(1,age)),radius=p.size||68;
 if(reduced){
  oval(c,0,0,radius*.62,radius*.27,'#90a87566','#f4dca0',2);
  for(const x of [-25,0,25])oval(c,x,3,6,3,'#b8d18b',outline,1.5);
  return;
 }
 for(let i=0;i<2;i++){
  const wave=Math.max(0,Math.min(1,(t-i*.14)/.72));
  if(wave<=0||wave>=1)continue;
  c.save();c.globalAlpha*=1-wave;
  const r=radius*(.25+.75*wave);
  // 空心波纹只描边，避免 Canvas 忽略空颜色后沿用填色盖住地面。
  c.beginPath();c.ellipse(0,0,r,r*.48,0,0,Math.PI*2);c.strokeStyle=outline;c.lineWidth=5-i;c.stroke();
  c.strokeStyle=i?'#90a875':'#f4dca0';c.lineWidth=3-i*.5;c.stroke();c.restore();
 }
 for(let i=0;i<10;i++){
  const a=i*Math.PI*.2+.17,d=radius*(.24+.62*Math.min(1,t*1.7)),flight=Math.max(0,Math.sin(Math.min(1,t*1.5)*Math.PI));
  const x=Math.cos(a)*d,y=Math.sin(a)*d*.48,z=flight*(18+(i%3)*7),spread=t>.67?(t-.67)*7:0;
  oval(c,x,y,4+spread,2,'#315c431c');
  oval(c,x,y-z,4+i%2+spread,5+flight*2-spread*.4,i%2?'#90a875':'#c2d89a',outline,1.6);
  oval(c,x-1,y-z-2,1.8,1.2,'#f4edbe');
 }
}

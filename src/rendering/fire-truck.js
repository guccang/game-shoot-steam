// 消防车独立车体、消防栓与装备帽；四轮复用真实位移相位，不旋转整车假行驶。
import {box,oval,poly,outline} from './primitives.js';
import {drawWheel} from './pine-wheels.js';
// 长水箱和四轮位于司机背后，侧水带卷保持清楚的消防剪影。
export function drawFireTruckRear(c,phase=0) {
  oval(c,4,17,57,21,'#315c4338');
  box(c,-43,-37,86,59,9,'#54735d',outline,2);
  for(const y of [-30,18])for(const x of [-46,46])drawWheel(c,x,y,phase);
  box(c,-40,-49,80,65,9,'#b5574d',outline,2.4);
  box(c,-34,-46,68,20,6,'#df9471',outline,2);
  box(c,-40,-22,80,9,2,'#f5df9e',outline,1.3);
  box(c,-26,-38,52,9,3,'#c7d5b4',outline,1.5);
  for(let i=0;i<5;i++)box(c,-22+i*10,-38,3,9,1,'#638774');
  oval(c,34,-11,14,18,'#f0cf92',outline,2);
  for(const r of [10,6])oval(c,34,-11,r,r*1.25,'#f0cf92', '#8f6950',1.7);
  oval(c,34,-11,2,3,'#436f5b');
  box(c,-22,-24,44,18,5,'#375c4e',outline,2);
  // 左侧消防栓与中央武器挂载分开；水管基座不跟随武器旋转。
  box(c,-41,-34,12,20,4,'#f0ce8b',outline,2);
  box(c,-47,-30,24,7,3,'#d67c59',outline,1.5);
  oval(c,-35,-35,8,4,'#d97b5f',outline,1.5);
}
// 短驾驶舱盖、奶油横带和警灯在司机前方，保留上半身及独立操枪。
export function drawFireTruckFront(c,hit=false) {
  box(c,-39,-4,78,31,7,hit?'#f5df9e':'#c76a55',outline,2.4);
  box(c,-34,0,68,8,2,'#f5df9e');
  box(c,-42,24,84,6,3,'#7f9781',outline,2);
  for(const x of [-33,23])box(c,x,14,10,6,2,'#fff0b8',outline,1.5);
  box(c,-20,17,40,6,2,'#597764',outline,1.5);
  for(const x of [-31,24]){box(c,x,-10,7,7,2,'#e49b74',outline,1.2);}
}
// 帽子是独立服饰层，不覆盖或替换原视频身体、小手与枪械。
export function drawFireHelmet(c,player) {
  c.save();c.translate(player.x,player.y);
  box(c,-14,-64,28,13,[9,9,2,2],'#edc16f',outline,1.7);
  box(c,-18,-53,36,4,2,'#f5df9e',outline,1.5);
  poly(c,[[-4,-61],[4,-61],[3,-54],[0,-52],[-3,-54]],'#c76a55',outline,1);
  c.restore();
}

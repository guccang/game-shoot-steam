// 草根短影、背光叶和亮尖组成一个小草簇，有限平涂保持手机上的干净轮廓。
export function drawGrassClump(c,x,y,seed=0,color=hex=>hex){
 const w=5+(seed%3);c.save();c.translate(x,y);
 c.fillStyle=color('#486d4930');c.beginPath();c.ellipse(2,2,w,1.8,0,0,Math.PI*2);c.fill();
 c.strokeStyle=color('#6d9159');c.lineWidth=1.8;c.lineCap='round';c.beginPath();c.moveTo(-3,1);c.quadraticCurveTo(-5,-2,-5,-4);c.moveTo(0,1);c.quadraticCurveTo(-1,-3,1,-7);c.moveTo(3,1);c.quadraticCurveTo(3,-2,6,-4);c.stroke();
 c.strokeStyle=color('#bdd48c');c.lineWidth=1;c.beginPath();c.moveTo(-5,-4);c.lineTo(-4,-2);c.moveTo(1,-7);c.lineTo(0,-4);c.stroke();c.restore();
}
// 营地与森林共用主地表缓存，保留诊断字段供性能面板读取。
export function groundDepthStats(){return {grassBytes:0};}

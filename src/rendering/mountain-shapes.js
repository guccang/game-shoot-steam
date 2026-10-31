// 六种岩山共用岩柱明暗材质，通过峰数、冠幅、台阶和谷口形成不同剪影。
const SHAPES = {
  mesa: [[.62,-.08,.28,.31,false],[-.12,0,.78,.84,true],[-.65,.5,.23,.2,true]],
  twins: [[-.42,-.15,.43,.99,true],[.48,.06,.42,.72,true],[-.1,.5,.28,.24,false]],
  needles: [[-.67,-.13,.21,.58,false],[.59,-.18,.24,.77,true],[-.22,0,.24,1,true],[.2,.4,.22,.57,false],[-.62,.6,.2,.22,true]],
  terraces: [[0,.12,.89,.3,true],[.06,-.03,.64,.61,true],[-.24,-.17,.36,.94,true]],
  ridge: [[-.64,-.1,.31,.42,true],[-.19,-.14,.4,.65,true],[.43,-.05,.43,.51,true],[.71,.4,.24,.23,false]],
  crown: [[-.1,-.3,.42,.45,true],[-.65,-.05,.28,.87,true],[.64,0,.29,.97,true],[.05,.5,.43,.25,false]],
};

// 岩柱从后往前绘制，全部落在原山脚范围，台地与双峰的阴影也进入同一图集。
export function drawMountainShape(c,item,column) {
  const parts=SHAPES[item.variant]||SHAPES.mesa;
  for(const [x,y,r,h,grass] of parts)column(c,x*item.rx,y*item.ry,r*item.rx,h*item.height,grass);
}

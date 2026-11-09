// 四类远林共用地貌场。沿环面弯曲山脊和林谷，让地图着色、植被及营址一致。
import {WORLD,delta,wrap,PREVIOUS_FOREST_WORLD} from './coordinates.js';

export const HABITATS={
  meadow:{id:'meadow',name:'晴叶花甸',label:[34600,23000],note:'开阔草地，散生圆冠树和成片野花。',ground:[207,217,148],trees:2,understory:[1,1,1,0,2]},
  pine:{id:'pine',name:'雾松密林',label:[12500,10300],note:'青灰松岭，石坡上长着低蕨。',ground:[137,174,152],trees:4,understory:[4,4,3,4,0]},
  amber:{id:'amber',name:'琥珀古林',label:[34100,9200],note:'暖金色枫林，石台边散生菌丛。',ground:[210,180,128],trees:3,understory:[5,3,5,0,1]},
  deep:{id:'deep',name:'幽苔禁林',label:[21900,21700],note:'浓绿柏林，倒木旁多蕨叶和菌丛。',ground:[123,159,125],trees:5,understory:[6,6,2,4,6]},
};
// 每段配置是林带中心、半长轴、半短轴和朝向；相邻的同类地貌自然连片。
const ridges=[
  ['pine',12500,10100,11200,3900,-.68],['pine',22400,4400,8700,4100,-.28],
  ['amber',33300,8200,10700,6200,.54],['amber',39800,15300,7600,4300,.95],
  ['deep',22500,20300,10100,6800,-.45],['deep',14700,24200,6700,4500,-.23],
  ['pine',4500,27900,9600,4400,-.91],['amber',17800,33100,7900,4100,.24],
  ['pine',35300,29600,9800,4700,-.4],['deep',46500,5200,4900,6800,.15],
].map(([id,x,y,rx,ry,angle])=>({id,x,y,rx,ry,cos:Math.cos(angle),sin:Math.sin(angle)}));

// 旧林区的近景继续由手工锚点接管，边缘的地面底色渐变衔接。
export function oldForestInfluence(x,y){
  const dx=Math.abs(delta(x-PREVIOUS_FOREST_WORLD.width/2,WORLD.width))-PREVIOUS_FOREST_WORLD.width/2;
  const dy=Math.abs(delta(y-PREVIOUS_FOREST_WORLD.height/2,WORLD.height))-PREVIOUS_FOREST_WORLD.height/2;
  return Math.max(0,1-Math.max(0,dx,dy)/950);
}

// 山势扰动首尾周期相接，查询返回主生境及其向开阔花甸过渡的强度。
export function forestHabitat(x,y,tint=null){
  const u=wrap(x,WORLD.width)*2*Math.PI/WORLD.width,v=wrap(y,WORLD.height)*2*Math.PI/WORLD.height;
  const px=x+1050*Math.sin(3*v+u)+410*Math.sin(7*v-u),py=y+950*Math.sin(3*u-v)+460*Math.sin(6*u+2*v);
  let id='meadow',strength=0,total=0;
  for(const r of ridges){
    const dx=delta(px-r.x,WORLD.width),dy=delta(py-r.y,WORLD.height);
    const along=(dx*r.cos+dy*r.sin)/r.rx,across=(dy*r.cos-dx*r.sin)/r.ry;
    const value=1-along*along-across*across;
    if(tint&&value>0){
      const weight=value**3;
      for(let k=0;k<3;k++)tint[k]+=HABITATS[r.id].ground[k]*weight;
      total+=weight;
    }
    if(value>strength){id=r.id;strength=value;}
  }
  if(tint){
    const mix=Math.min(1,strength*1.85);
    for(let k=0;k<3;k++)tint[k]=HABITATS.meadow.ground[k]*(1-mix)+tint[k]/(total||1)*mix;
  }
  return {dominant:strength>.15?HABITATS[id]:HABITATS.meadow,strength};
}

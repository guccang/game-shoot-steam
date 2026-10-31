// 追加作物的三阶段透明图集；共享绘本描边与根部，不生成逐株运行缓存。
import {readFile,writeFile} from 'node:fs/promises';
import {FARM_CROPS} from '../../../src/config/farm.js';
const folder=new URL('../',import.meta.url),ink='#486348',green='#87aa67',light='#b7cd84',gold='#d9bd70';
// 基础平涂图形：颜色不替代物种自身的枝叶、穗粒及花果结构。
function path(d,fill=green,width=1.7){return `<path d="${d}" fill="${fill}" stroke-width="${width}"/>`;}
// 细茎和叶脉保持连接，透明区域不带地面色块。
function stem(d,color=ink,width=2){return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"/>`;}
// 局部椭圆用于叶片、果实和穗粒；不用于整株旋转动画。
function oval(x,y,rx,ry,angle=0,color=green){return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${angle} ${x} ${y})" fill="${color}"/>`;}
// 尖叶从茎部生出，剑叶与宽叶的剪影由宽高分别控制。
function blade(x,y,w,h,angle=0,color=green){return `<g transform="translate(${x} ${y}) rotate(${angle})">${path(`M0 0 Q${-w} ${-h*.55} 0 ${-h} Q${w} ${-h*.45} 0 0`,color)}${stem(`M0 0 L0 ${-h*.85}`,'#78905c',1)}</g>`;}
// 花瓣围绕同一花心，瓣数、长宽和叠层区分花卉种类。
function flower(x,y,n,r,w,color,center='#d9bd70',layers=1){return `<g transform="translate(${x} ${y})">${Array.from({length:layers},(_,layer)=>Array.from({length:n},(_,i)=>`<g transform="rotate(${i*360/n+layer*19})">${oval(0,-r*(1-layer*.28),w*(1-layer*.18),r*.65,0,color)}</g>`).join('')).join('')}${oval(0,0,3,3,0,center)}</g>`;}
// 谷物成熟形态：长芒、大分枝、密穗、弯穗和直立红穗独立组织。
function cereal(kind){
 const idx=['barley','oat','rye','millet','sorghum'].indexOf(kind);
 return [-17,0,18].map((x,j)=>{
  const top=-57-(j===1?12:0),bend=idx===3?9:0;
  let s=stem(`M${x/3} 0 Q${x-4} -35 ${x} ${top}`)+blade(x/2,-12,5,35,x<0?-35:35);
  if(idx===1)return s+[-1,1].map(side=>[0,1,2].map(k=>stem(`M${x} ${top+8+k*7} L${x+side*(9-k)} ${top+14+k*7}`)+oval(x+side*(10-k),top+18+k*7,3,6,side*15,gold)).join('')).join('');
  if(idx===4)return s+oval(x,top+6,8,17,0,'#b58360')+[-4,0,4].map(dx=>[0,1,2,3].map(k=>oval(x+dx,top-5+k*7,2.8,3,0,k%2?'#c59b6a':'#b6865e')).join('')).join('');
  s+=stem(`M${x} ${top+24} Q${x+bend} ${top-8} ${x+bend+2} ${top-9}`,'#a38c51');
  for(let k=0;k<5;k++)for(const side of [-1,1]){const y=top+19-k*5,cx=x+bend*k/5;s+=oval(cx+side*3,y,idx===2?2.5:3.5,5,side*35,gold);if(idx===0)s+=stem(`M${cx+side*4} ${y-3} l${side*4} -12`,'#b79a5c',1);}
  return s;
 }).join('');
}
// 分枝豆株、低矮花生、芝麻节蒴与荞麦疏花分别绘制。
function legumes(kind,mature=true){
 const low=kind==='peanut',height=low?35:62;let s=stem(`M0 0 L0 ${-height}`,'#647f4d',3);
 for(const side of [-1,1])for(let j=0;j<2;j++){const x=side*(20-j*7),y=-18-j*23;s+=stem(`M0 ${y+12} L${x} ${y}`)+oval(x,y,low?10:9,low?5:6,side*-25)+oval(x-side*5,y-8,6,9,side*30,light);}
 if(!mature)return s;
 if(kind==='buckwheat')return s+[[-20,-48],[1,-69],[20,-58]].map(([x,y])=>flower(x,y,5,4,2,'#f0e6cb')).join('');
 if(low)return s+[-12,11].map(x=>`<g transform="translate(${x} -8)">${path('M-10 -4 Q-6 -11 0 -6 Q10 -12 12 -3 Q11 6 3 4 Q-7 10 -10 -4', '#c4a06b')}${stem('M-5 -4 L5 3 M2 -6 L-2 6','#9e8259',1)}</g>`).join('');
 if(kind==='sesame')return s+[-1,1].map(side=>[0,1,2].map(j=>oval(side*7,-21-j*17,4,8,side*20,'#c3bb7b')+stem(`M${side*7} ${-28-j*17} l0 14`,'#8b9664',1)).join('')).join('');
 return s+[-1,1].map((side,j)=>`<g transform="translate(${side*16} ${-27-j*12}) rotate(${side*20})">${path(kind==='mung-bean'?'M-3 -15 Q-10 3 -2 15 Q5 7 4 -14Z':'M-5 -12 Q-13 0 -3 14 Q8 8 6 -10Z',kind==='mung-bean'?'#7c9f59':'#b18e71')}${stem('M0 -10 L0 10','#647c4f',1)}</g>`).join('');
}
// 蔬菜幼苗不显示成熟根果；各成熟蔬菜有独立轮廓。
function vegetable(kind,mature=true){
 if(kind==='radish')return [-35,0,30].map(a=>blade(0,-20,9,mature?42:25,a)).join('')+(mature?path('M-12 -27 Q0 -34 12 -27 Q14 -8 0 0 Q-13 -9 -12 -27','#eee8c4'): '');
 if(kind==='onion')return [-18,-5,10,24].map(a=>blade(0,-15,3,mature?55:30,a)).join('')+(mature?path('M-5 -27 Q-22 -17 -17 -7 Q0 6 17 -7 Q22 -17 5 -27Z','#d6b385')+stem('M-4 -24 Q-13 -8 -3 -2 M5 -24 Q14 -8 4 -2','#aa8961',1):'');
 if(kind==='spinach')return [-45,-20,8,35].map((a,j)=>blade(j-2,-1,12,mature?55-j*4:28,a,j%2?light:green)).join('');
 if(kind==='broccoli')return path('M-6 0 L-10 -34 L-23 -46 L-14 -51 L0 -37 L16 -53 L23 -46 L9 -30 L7 0Z')+blade(-5,-8,12,34,-45)+blade(6,-7,12,35,40)+(mature?[[-22,-52,12],[-8,-62,13],[12,-62,15],[25,-49,12],[0,-47,17]].map(([x,y,r],j)=>oval(x,y,r,r*.8,0,j%2?'#9bb477':'#668e59')).join(''):'');
 if(kind==='potato'||kind==='sweet-potato'){
  let s=stem('M0 0 Q-10 -18 -24 -27 M0 0 Q12 -20 24 -31 M0 0 L0 -48');
  for(const [x,y] of [[-24,-27],[24,-31],[0,-48],[-9,-38],[13,-19]])s+=kind==='potato'?oval(x,y,10,7,x,light):`<g transform="translate(${x} ${y})">${path('M0 8 C-22 -4 -12 -18 0 -9 C12 -18 22 -4 0 8')}</g>`;
  return s+(mature?(kind==='potato'?oval(-12,-6,12,8,-15,'#c9ae7f')+oval(11,-7,10,7,20,'#dec394')+oval(-15,-9,1,1,0,ink):oval(-9,-7,17,6,-18,'#b48370')+oval(13,-9,13,5,25,'#c29178')):'');
 }
 const vine=['cucumber','pea'].includes(kind);let s=stem(vine?'M0 0 Q-16 -24 1 -45 Q16 -65 0 -74':'M0 0 L0 -65 M0 -20 L-23 -39 M0 -42 L21 -59','#617e4c',3);
 for(const [x,y] of [[-20,-40],[18,-57],[-7,-66],[19,-24]])s+=stem(`M0 ${y+10} L${x} ${y}`)+blade(x,y+6,kind==='eggplant'?13:10,18,x<0?-45:40);
 if(vine)s+=stem('M3 -48 Q32 -48 26 -62 Q18 -66 20 -55 M-4 -24 Q-30 -28 -24 -39','#7d965b',1.5);
 if(!mature)return s;
 return s+[-1,1].map((side,j)=>`<g transform="translate(${side*17} ${-28-j*18})">${kind==='eggplant'?path('M-4 -9 Q-16 -1 -11 13 Q-6 21 2 15 Q13 5 4 -9Z','#99829f'):kind==='pepper'?path('M0 -8 Q-14 -14 -12 5 Q-12 16 -3 12 Q6 19 12 8 Q16 -13 0 -8','#d1a05f'):kind==='cucumber'?oval(0,3,6,16,15,'#83a35d')+stem('M-1 -7 L-3 12','#b7c77e',1.5):path('M-4 -13 Q-15 3 -3 17 Q10 5 4 -12Z','#a9ba73')+[-5,2,9].map(y=>oval(-1,y,3,3,0,'#d0d993')).join('')}${blade(0,-6,5,8,-40)}</g>`).join('');
}
// 果树根据品种分别定义冠团分布和叶形，果实挂点接在冠内。
const crowns=[
 [[-21,-47,15,17],[0,-64,18,16],[21,-45,16,18]],
 [[-17,-53,15,20],[5,-65,15,17],[19,-43,16,19]],
 [[-23,-46,16,16],[0,-56,21,22],[24,-48,14,17]],
 [[-21,-55,14,18],[2,-65,19,17],[21,-46,17,19]],
 [[-20,-39,16,22],[-10,-64,13,16],[14,-60,17,19],[24,-38,12,14]],
 [[-20,-47,17,19],[0,-65,16,15],[19,-49,18,22]],
 [[-17,-42,20,22],[1,-64,21,18],[20,-42,17,19]],
 [[-19,-54,18,14],[0,-69,15,12],[21,-54,17,14],[0,-38,20,15]],
 [[-22,-49,14,19],[0,-65,19,17],[22,-50,15,18],[2,-39,19,14]],
 [[-22,-49,16,15],[0,-67,16,16],[23,-49,15,16]],
];
// 樱桃成对、柠檬尖端、石榴冠口、荔枝小簇与无花果水滴分别保留。
function fruit(kind,x,y){
 let s='';
 if(kind==='cherry')s=stem('M0 -10 L-5 2 M0 -10 L6 0','#7f7450',1.5)+oval(-5,4,5,5,0,'#bf8270')+oval(6,2,5,5,0,'#d79a7f');
 else if(kind==='lemon')s=path('M-10 0 Q-7 -8 2 -7 L7 -8 L8 -4 Q14 5 4 8 L-1 10 L-4 7 Q-13 7 -10 0','#e1cf7b');
 else if(kind==='persimmon')s=oval(0,2,10,7,0,'#d8a16b')+path('M0 -6 L-7 -8 L-3 -3 L5 -3 L8 -8Z','#77965a');
 else if(kind==='pomegranate')s=oval(0,2,9,9,0,'#c48c75')+path('M-4 -6 L-5 -12 L0 -9 L5 -12 L4 -6Z','#c48c75');
 else if(kind==='pomelo')s=path('M-3 -10 Q-6 -7 -10 1 Q-13 14 0 14 Q13 14 10 1 Q6 -7 3 -10Z','#c5c77f');
 else if(kind==='lychee')s=[[-4,-3],[5,-1],[0,7]].map(([dx,dy])=>oval(dx,dy,5,5,0,'#c79286')+stem(`M${dx-2} ${dy-1} l2 -2 l2 2`,'#9f7f69',1)).join('');
 else if(kind==='loquat')s=[[-5,0],[4,3],[0,-6]].map(([dx,dy])=>oval(dx,dy,4,6,dx*4,'#dcba78')+oval(dx,dy+4,1,1,0,ink)).join('');
 else if(kind==='fig')s=path('M-2 -10 Q-2 -5 -8 2 Q-12 13 0 13 Q12 13 8 2 Q2 -5 2 -10Z','#a792ad');
 else s=oval(0,2,kind==='plum'?7:8,kind==='plum'?10:8,10,kind==='plum'?'#9f8da7':'#e0b78a')+stem('M2 -4 Q-2 3 2 8','#a48b75',1);
 return `<g transform="translate(${x} ${y})" stroke-width="1.3">${s}</g>`;
}
// 幼树保留枝干及少量嫩叶；成熟冠团有一致左上亮部，无额外夜间图集。
function tree(kind,mature){
 const index=['cherry','plum','apricot','persimmon','pomegranate','lemon','pomelo','loquat','lychee','fig'].indexOf(kind);
 let s=stem(`M0 0 L${index%3-1} -45 M0 -20 L-21 -45 M0 -27 L21 -55`,'#9e855f',5);
 if(!mature)return s+[-1,1].map(side=>blade(side*17,-35,9,23,side*40,light)).join('')+blade(0,-45,8,18);
 s+=crowns[index].map(([x,y,rx,ry],j)=>oval(x,y,rx,ry,0,j%2?'#99b572':'#7f9f63')+oval(x-3,y-5,rx*.65,ry*.5,0,light)).join('');
 if(kind==='fig')s+=[-22,0,23].map(x=>`<g transform="translate(${x} -50)">${path('M0 8 L-10 0 L-7 -5 L-12 -10 L-4 -12 L0 -20 L5 -11 L12 -12 L9 -4 L12 0Z','#9cba72')}</g>`).join('');
 if(kind==='loquat')s+=[-18,4,22].map(x=>blade(x,-44,6,22,x,light)).join('');
 return s+[[-21,-40],[0,-56],[20,-37]].map(([x,y])=>fruit(kind,x,y)).join('');
}
// 花卉按枝条、叶形、花序和花瓣结构区分，花苞与开放花独立。
function ornamental(kind,mature){
 const woody=['osmanthus','camellia','hydrangea'].includes(kind),sword=kind==='iris';
 let s=stem(woody?'M0 0 L0 -55 M0 -16 L-22 -40 M0 -30 L22 -52':'M0 0 Q-4 -38 0 -60 M0 -7 L-22 -42 M0 -13 L22 -48',woody?'#927d5b':ink,woody?4:2);
 s+=sword?[-28,-12,13,29].map(a=>blade(0,0,5,59,a)).join(''):[[-15,-20],[14,-31],[-17,-43],[12,-48]].map(([x,y])=>blade(x,y,kind==='cosmos'?3:woody?10:7,kind==='cosmos'?23:19,x<0?-55:45)).join('');
 if(!mature)return s+oval(0,-60,4,6,0,light);
 if(kind==='rose')return s+flower(0,-62,5,9,7,'#d69b9d','#bf7f82',2)+flower(-22,-42,5,6,4,'#e5b4a5');
 if(kind==='peony')return s+flower(0,-59,8,12,7,'#e0b1af','#ddc880',2)+flower(22,-48,7,6,4,'#edc8b4');
 if(kind==='chrysanthemum')return s+[[0,-61],[-22,-42],[22,-48]].map(([x,y])=>flower(x,y,13,9,2.6,'#e7d18b')).join('');
 if(kind==='marigold')return s+[[0,-61],[-22,-42],[22,-48]].map(([x,y])=>flower(x,y,7,8,5,'#dcb275','#c59d61',2)).join('');
 if(kind==='lily')return s+[[0,-61],[-22,-42]].map(([x,y])=>flower(x,y,6,10,4,'#eee5bf','#bd9d60')+stem(`M${x} ${y} l3 -7 M${x} ${y} l-4 -6`,'#ad8e5e',1.3)).join('');
 if(kind==='hydrangea')return s+[[0,-60],[-22,-40],[22,-47]].map(([x,y])=>oval(x,y,14,12,0,'#a5a9bd')+[[-6,-3],[4,-5],[-1,5],[8,4]].map(([dx,dy])=>flower(x+dx,y+dy,4,3,2,'#c1c0ce')).join('')).join('');
 if(kind==='osmanthus')return s+[[-18,-42],[0,-60],[21,-50]].map(([x,y])=>[-5,3].map(dx=>flower(x+dx,y,4,3,2,'#e4cb86')).join('')).join('');
 if(kind==='camellia')return s+flower(0,-61,6,9,7,'#dba6a0','#dab968',2)+flower(22,-48,5,7,5,'#efc5ad');
 if(kind==='iris')return s+`<g transform="translate(0 -59)">${[-1,1].map(side=>oval(side*9,-8,6,13,side*25,'#a69ebd')+oval(side*11,7,12,6,side*30,'#b9afd0')).join('')}${blade(0,4,5,17,0,'#dfcf95')}</g>`;
 return s+[[0,-61],[-22,-42],[22,-48]].map(([x,y])=>flower(x,y,8,9,5,'#e1b4c1')).join('');
}
// 藜麦保留宽叶与带红节的分枝，成熟才结出上窄下宽的簇状穗。
function quinoa(mature){
 let s=stem('M0 0 L0 -68 M0 -22 L-19 -46 M0 -32 L20 -51','#ac8770',3);
 for(const [x,y,a] of [[-12,-20,-48],[12,-31,45],[-20,-39,-55],[20,-44,48]])s+=blade(x,y,10,18,a,light);
 if(mature)for(const [x,y,size] of [[0,-70,1],[-19,-47,.7],[20,-52,.8]])s+=`<g transform="translate(${x} ${y}) scale(${size})">${path('M0 -13 Q-7 -3 -11 11 Q0 18 11 11 Q7 -3 0 -13Z','#ccab8a')}${[[-2,-5],[2,1],[-4,5],[4,9],[-4,12]].map(([dx,dy])=>oval(dx,dy,3,3,0,'#e2c699')).join('')}</g>`;
 return s;
}
// 芦笋直立笋茎高度错落，鳞片和锥形顶部独立于普通细叶谷物。
function asparagus(mature){return [-19,-7,7,20].map((x,i)=>{
 const h=(mature?54:32)+(i===1?22:i===2?10:0),w=mature?5:3;
 return `<g transform="translate(${x} 0)">${path(`M${-w} 0 L${-w} ${-h+13} Q${-w} ${-h+6} 0 ${-h} Q${w} ${-h+6} ${w} ${-h+13} L${w} 0Z`,i%2?light:green)}${Array.from({length:mature?4:2},(_,j)=>path(`M${-w} ${-h+12+j*12} L0 ${-h+7+j*12} L${w} ${-h+12+j*12}`,'#a2b67a',1)).join('')}</g>`;
}).join('');}
// 水仙用基生带状叶、弯曲花梗及突出的黄色花冠，与百合的枝生叶区分。
function daffodil(mature){
 let s=[-27,-9,13,29].map(a=>blade(0,0,5,52,a)).join('')+stem('M0 0 L0 -62 Q-1 -74 13 -69 M-3 0 L-18 -42 Q-19 -56 -29 -50','#718e58',3);
 if(!mature)return s+oval(13,-69,4,7,40,light)+oval(-29,-50,3,6,-40,light);
 for(const [x,y] of [[13,-65],[-27,-46]])s+=flower(x,y,6,8,4,'#eee8c5')+`<g transform="translate(${x} ${y})">${path('M-4 -3 Q-5 2 -6 5 Q0 10 6 5 Q5 2 4 -3Z','#e2bf68')}${oval(0,5,6,3,0,'#bf9a4e')}</g>`;
 return s;
}
// 萌芽使用种类对应的窄叶、圆子叶或木质嫩芽，不提前显示花果。
function sprout(crop){return stem('M0 0 L0 -12')+((crop.category==='grain'&&crop.id!=='quinoa'||['asparagus','daffodil'].includes(crop.id))?blade(0,-3,3,18,-32)+blade(0,-5,3,18,27):oval(-6,-11,7,4,25,light)+oval(6,-15,7,4,-25,green));}
// 每阶段使用独立结构；幼谷只有茎叶，成熟才添加穗粒。
function plant(crop,stage){
 if(stage===0)return sprout(crop);
 const mature=stage===2;
 if(crop.id==='quinoa')return quinoa(mature);
 if(crop.id==='asparagus')return asparagus(mature);
 if(crop.id==='daffodil')return daffodil(mature);
 if(crop.category==='vegetable')return vegetable(crop.id,mature);
 if(crop.category==='fruit')return tree(crop.id,mature);
 if(crop.category==='ornamental')return ornamental(crop.id,mature);
 if(['barley','oat','rye','millet','sorghum'].includes(crop.id))return mature?cereal(crop.id):[-30,0,27].map(a=>blade(0,0,4,42,a)).join('');
 return legumes(crop.id,mature);
}
const manifest=JSON.parse(await readFile(new URL('manifest.json',folder),'utf8')),file='crops-category-expansion.svg',parts=[];
// 首四十种保留原格位，后续追加阶段紧凑排在底部，避免多分配空白行。
const sheetHeight=1152+Math.ceil(Math.max(0,FARM_CROPS.length-57)*3/10)*96;
for(const [offset,crop] of FARM_CROPS.slice(17).entries())for(let stage=0;stage<3;stage++){
 const extra=(offset-40)*3+stage,col=offset<40?offset%10:extra%10,row=offset<40?Math.floor(offset/10)*3+stage:12+Math.floor(extra/10);
 // 幼苗独立形体缩至自己的格内；世界仍由正式生长采样处理阶段间过渡。
 parts.push(`<g transform="translate(${col*96+48} ${row*96+88})" stroke="${ink}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><g${stage===1?' transform="scale(.68)"':''}>${plant(crop,stage)}</g></g>`);
 const [x,y,w,h]=stage===0?[30,62,36,28]:stage===1?[18,28,60,62]:[6,2,84,88];
 manifest.crops[`crop-${offset+17}-${stage}`]={file,sheet:[960,sheetHeight],rect:[col*96+x,row*96+y,w,h],anchor:[.5,1]};
}
manifest.runtimeFiles=[...new Set([...manifest.runtimeFiles,file])];
await writeFile(new URL(file,folder),`<!-- 追加作物；由source/build-category-expansion.mjs生成，透明底三阶段。 -->\n<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${sheetHeight}" viewBox="0 0 960 ${sheetHeight}">`+parts.join('')+'</svg>\n');
await writeFile(new URL('manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');

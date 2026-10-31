// 九种新增作物的透明SVG三阶段图集生成器；与原PNG共用尺寸、根部和manifest接口。
import {writeFile,readFile} from 'node:fs/promises';
const folder=new URL('../',import.meta.url),green='#527546',light='#9fbd70',dark='#355b40';
// 有限平涂和材质描边，叶片角度用于形体组织，不作为成熟株整体旋转动画。
function leaf(x,y,rx=9,ry=4,angle=0,color=light){return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${angle} ${x} ${y})" fill="${color}"/>`;}
// 所有茎叶都连接同一个根部，三阶段独立绘制。
function stem(path,color=green,width=3){return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}"/>`;}
// 萌芽只画子叶，谷物细尖、白菜宽圆、果树木质新芽各有轮廓。
function sprout(kind){return stem('M0 0 Q-2 -8 0 -14')+leaf(-6,-12,kind==='rice'?9:7,kind==='rice'?2:4,30)+leaf(6,-16,7,3,-30);}
// 幼苗阶段保留各品种叶形，果树尚未结实，花卉尚未开放。
function young(kind){
 if(kind==='rice')return stem('M0 0 Q-18 -22 -17 -42 M0 0 Q4 -30 0 -52 M0 0 Q15 -28 22 -39',green,3)+leaf(-8,-22,17,3,50)+leaf(10,-30,18,3,-55);
 if(kind==='cabbage')return leaf(-12,-12,16,10,-28)+leaf(12,-14,17,11,30)+leaf(-5,-23,13,19,-15)+leaf(8,-25,12,17,20);
 if(kind==='tulip')return stem('M0 0 L0 -43')+leaf(-10,-20,6,25,-24)+leaf(9,-27,5,24,24)+leaf(0,-48,4,7,0,'#b5c983');
 if(kind==='lavender')return [-12,0,12].map((x,i)=>stem(`M0 0 Q${x} -17 ${x} ${-40-i*4}`)+leaf(x-5,-24,9,2,35)+leaf(x+4,-30,8,2,-35)).join('');
 return stem('M0 0 L0 -44 M0 -18 L-16 -31 M0 -29 L16 -43',green,kind==='soybean'?3:5)+leaf(-17,-32,10,5,25)+leaf(15,-43,11,5,-25)+leaf(-4,-49,8,5,70)+leaf(6,-18,9,5,-25);
}
// 穗粒沿弯垂穗轴错落，区别小麦原有直立穗形。
function rice(){return [-15,0,16].map((x,i)=>stem(`M${x/3} 0 Q${x-7} -39 ${x} ${-65+i*4} Q${x+9} ${-75+i*4} ${x+17} ${-55+i*4}`,'#938147',3)+[0,1,2,3].map(n=>leaf(x+4+n*4,-66+i*4+n*2,3,6,-25,'#dfc675')).join('')).join('')+leaf(-14,-24,23,3,52)+leaf(15,-34,24,3,-55);}
// 豆荚有三个鼓包，三片小叶组成分枝，和谷物窄叶区别。
function soybean(){return stem('M0 0 L0 -69 M0 -21 L-22 -43 M0 -43 L22 -61')+[-1,1].map(side=>leaf(side*17,-52,12,7,side*-25)+leaf(side*24,-36,10,6,side*-15)+leaf(side*6,-66,10,7,side*-55)+`<path d="M${side*9} -37 C${side*25} -42 ${side*27} -24 ${side*18} -17 Q${side*8} -20 ${side*9} -37" fill="#b8c77c"/>`+[-31,-25,-20].map(y=>leaf(side*18,y,3,3,0,'#d4d999')).join('')).join('');}
// 白菜的外叶展开，浅色包心和叶脉表现层叠结构。
function cabbage(){return leaf(-20,-20,16,23,-38)+leaf(21,-22,17,25,38)+leaf(-10,-37,17,30,-13,'#91b86c')+leaf(11,-39,17,31,15,'#a7c57d')+leaf(0,-36,16,32,0,'#d9dda1')+stem('M0 -4 Q-4 -30 0 -60 M-8 -8 Q-25 -23 -29 -36 M9 -8 Q25 -26 29 -38','#7f9b64',2);}
// 果树按树冠高度和宽度、枝叉与果实形状区分，不仅更换颜色。
function tree(kind){
 const crown={apple:'M-32 -38 Q-40 -57 -24 -65 Q-19 -82 -2 -75 Q13 -86 22 -69 Q40 -66 33 -47 Q25 -30 7 -34 Q-13 -26 -32 -38Z',pear:'M-24 -35 Q-32 -50 -18 -61 Q-21 -74 -6 -77 Q7 -87 16 -71 Q27 -64 21 -55 Q37 -38 20 -30 Q0 -25 -24 -35Z',peach:'M-34 -46 Q-37 -65 -18 -64 Q-6 -78 4 -65 Q25 -80 33 -62 Q42 -42 20 -37 Q4 -46 -8 -35 Q-31 -28 -34 -46Z',orange:'M-28 -35 Q-40 -53 -24 -69 Q-8 -84 11 -73 Q31 -76 36 -56 Q38 -34 18 -29 Q-11 -22 -28 -35Z'}[kind];
 const trunk='<path d="M-4 0 L-3 -38 L4 -40 L4 0Z" fill="#b29469" stroke="#796548"/>'+stem('M0 -26 L-18 -48 M3 -29 L21 -51','#796548',5);
 const shadow=`<path d="${crown}" fill="#71985c"/><path d="M-26 -58 Q-12 -77 4 -65 Q17 -73 23 -59 Q3 -52 -17 -48Z" fill="#a1bb75" stroke="none"/>`;
 return trunk+shadow+[[-20,-51],[10,-57],[22,-40],[-2,-35]].map(([x,y])=>fruit(kind,x,y)).join('');
}
// 苹果带凹口、梨上窄下宽、桃有尖底与缝线、橙子圆实带叶。
function fruit(kind,x,y){const shape=kind==='apple'?'<path d="M0 -5 C-11 -12 -13 3 -5 8 Q0 5 5 8 C13 2 10 -12 0 -5" fill="#d98965"/>':kind==='pear'?'<path d="M-3 -7 Q-8 -3 -8 3 Q-8 11 0 11 Q10 10 8 3 Q3 -3 3 -7Z" fill="#dbc975"/>':kind==='peach'?'<path d="M0 -6 C-12 -10 -14 4 0 11 C14 4 12 -10 0 -6" fill="#e4ac8f"/><path d="M1 -5 Q-3 1 0 9" fill="none" stroke="#b97c66"/>':'<circle r="8" fill="#dda35d"/>';
 return `<g transform="translate(${x} ${y})" stroke="#697049" stroke-width="1.5">${shape}${stem('M0 -5 L2 -10','#746442',2)}${leaf(5,-9,5,2,-25,'#8eaf64')}</g>`;
}
// 郁金香用直立杯状花瓣，宽叶与薰衣草的多支细穗形成区别。
function tulip(){return stem('M0 0 L0 -56 M-6 0 L-20 -45 M8 0 L22 -52')+leaf(-12,-24,7,27,-26)+leaf(12,-30,6,30,24)+[[-20,-48,0],[0,-61,1],[22,-54,0]].map(([x,y,i])=>`<g transform="translate(${x} ${y})"><path d="M-10 -10 L-3 -5 L1 -13 L5 -5 L11 -10 Q14 10 0 13 Q-13 9 -10 -10Z" fill="${i?'#dda08e':'#e4b68d'}" stroke="#947563"/><path d="M0 11 L1 -9" fill="none" stroke="#b58977"/></g>`).join('');}
// 薰衣草的长花穗由错落小花簇构成，保留可辨的细长负空间。
function lavender(){return [-22,-10,3,15,26].map((x,i)=>stem(`M0 0 Q${x} -25 ${x} ${-52-i%3*8}`)+leaf(x/2-6,-20,12,2,35)+leaf(x/2+5,-32,11,2,-35)+[0,1,2,3].map(n=>leaf(x+(n%2?2:-2),-43-i%3*8-n*6,4,5,n%2?25:-25,n%2?'#b3a0bb':'#93869f')).join('')).join('');}
const kinds=['rice','soybean','cabbage','apple','pear','peach','orange','tulip','lavender'];
const mature={rice,soybean,cabbage,apple:()=>tree('apple'),pear:()=>tree('pear'),peach:()=>tree('peach'),orange:()=>tree('orange'),tulip,lavender};
const manifest=JSON.parse(await readFile(new URL('manifest.json',folder),'utf8')),file='crops-expansion.svg',parts=[];
for(const [column,kind] of kinds.entries())for(let stage=0;stage<3;stage++){
 parts.push(`<g transform="translate(${column*96+48} ${stage*96+90})" stroke="${dark}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${stage===0?sprout(kind):stage===1?young(kind):mature[kind]()}</g>`);
 const [x,y,w,h]=stage===0?[32,67,32,23]:stage===1?[18,31,60,59]:[8,5,80,85];
 manifest.crops[`crop-${column+8}-${stage}`]={file,sheet:[864,288],rect:[column*96+x,stage*96+y,w,h],anchor:[.5,1]};
}
manifest.runtimeFiles=[...new Set([...manifest.runtimeFiles,file])];
await writeFile(new URL(file,folder),'<!-- 四类作物扩展：透明底、三阶段、固定根部；由source/build-expansion.mjs生成。 -->\n<svg xmlns="http://www.w3.org/2000/svg" width="864" height="288" viewBox="0 0 864 288">'+parts.join('')+'</svg>\n');
await writeFile(new URL('manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');

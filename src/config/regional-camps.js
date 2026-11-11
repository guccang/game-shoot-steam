// 五方营地为固定友善聚落；坐标、剧情和商品保持稳定标识，独立于怪物据点。
export const REGIONAL_CAMPS=[
 {id:'mossbrook',seDevice:'autopilot',name:'苔溪营地',region:'西南苔原林',x:7000,y:19000,npc:'苔婆婆',hero:1,house:'cat-home',seeds:[4,8,12],clue:'sentinel',engine:5,gun:25,story:'断水的苗圃',intro:'旧水车停了，幼苗等着溪水。我的水车图纸落在东边林道的木匣里，请帮我带回来。',parcel:'水车图纸',ending:'照着图纸接好水槽，苗圃又能喝到溪水了。薄荷愿意跟你一起巡林。'},
 {id:'emberforge',seDevice:'rocket',name:'赤炉营地',region:'北部火山外缘',x:17713,y:5867,npc:'炉叔',hero:2,house:'construction',seeds:[6,15,21],clue:'longbranch',engine:6,gun:26,story:'最后一枚铆钉',intro:'撤离时丢了祖传的铆钉模具。去东边的旧运输箱找找，修好炉门，我们就能继续造引擎。',parcel:'铆钉模具',ending:'炉门终于合拢了。这炉钢献给守护森林的朋友，银豆也想加入你的营地。'},
 {id:'snowcedar',seDevice:'flare',name:'雪松营地',region:'东北雪山脚下',x:37382,y:6348,npc:'松爷爷',hero:4,house:'relay',seeds:[3,18,27],clue:'cedar',engine:7,gun:27,story:'没有寄出的信',intro:'雪团的巡山队多年没收到山下的消息。东边补给匣里有最后一袋信，请带回来让大家安心。',parcel:'巡山邮袋',ending:'原来老朋友们一直惦记着这里。雪团终于可以放心出门，替大家看看更远的森林。'},
 {id:'rainbell',seDevice:'combat',name:'雨铃营地',region:'东南雨林边缘',x:38464,y:26567,npc:'铃阿姨',hero:3,house:'furniture',seeds:[10,24,36],clue:'honeycomb',engine:8,gun:28,story:'听得见的归路',intro:'雨太大，巡林猫听不见回家的铃声。东边遗落的货箱里有共鸣片，请帮我们修好路铃。',parcel:'路铃共鸣片',ending:'铃声又穿过雨林了。摩卡会记住每一条归路，也愿意陪你去找新的营地。'},
 {id:'stratacove',seDevice:'shield',name:'层岩营地',region:'南部层岩台地',x:22889,y:30293,npc:'岩师傅',hero:5,house:'warehouse',seeds:[14,30,42],clue:'twin-heart',engine:9,gun:29,story:'岩层里的名字',intro:'旧勘测队把伙伴的名字刻在标本册里。它留在东边的勘测箱中，我想把大家的故事接着讲下去。',parcel:'岩层标本册',ending:'每一层岩石都记得一段旅程。墨墨愿意带着这些名字，去你的营地开始新故事。'},
];
// 引擎目录追加在原有探索引擎之后，不移动旧存档编号。
export const REGIONAL_ENGINES=[
 {id:'moss-flow',name:'苔溪轻行引擎',payload:1.35,tow:1.2,speed:1.12,mass:.02,cost:1800},
 {id:'ember-piston',name:'赤炉锻钢引擎',payload:1.8,tow:1.8,speed:.88,mass:.05,cost:2600},
 {id:'snow-steady',name:'雪松稳行引擎',payload:1.55,tow:1.5,speed:1,mass:.03,cost:2400},
 {id:'rain-turbo',name:'雨铃疾行引擎',payload:1.2,tow:1.1,speed:1.22,mass:.02,cost:2800},
 {id:'strata-haul',name:'层岩牵引引擎',payload:1.65,tow:2,speed:.9,mass:.05,cost:3000},
].map((e,i)=>({...e,regional:REGIONAL_CAMPS[i].id,price:0}));
// 主炮使用正式弹药、射击与独立后坐；五种射速、射程和载重取向不同。
export const REGIONAL_GUNS=[
 {id:'moss-burst',name:'苔溪轻连炮',damage:26,interval:.2,range:410,magazineSize:45,reloadTime:2,ammo:'light',mass:75,cost:1600},
 {id:'ember-shell',name:'赤炉破岩炮',damage:235,interval:2.8,range:540,magazineSize:1,reloadTime:2.8,ammo:'shell',mass:410,cost:2800,pierce:2},
 {id:'snow-range',name:'雪松远望炮',damage:145,interval:1.9,range:720,magazineSize:2,reloadTime:3.8,ammo:'shell',mass:300,cost:2600},
 {id:'rain-twin',name:'雨铃双响炮',damage:38,interval:.42,range:430,magazineSize:36,reloadTime:2.6,ammo:'light',mass:125,cost:2400,pellets:2,spread:.12},
 {id:'strata-heavy',name:'层岩震地炮',damage:420,interval:3.2,range:600,magazineSize:1,reloadTime:3.2,ammo:'heavy',mass:580,cost:3400,blastRadius:75,blastRatio:.45},
].map((w,i)=>({speed:1000,pellets:1,spread:0,impulse:180,color:'#ead299',hitRadius:4,aimAssist:true,muzzle:[49,68,90,49,58][i],...w,weaponIndex:25+i,hullIndex:null,regional:REGIONAL_CAMPS[i].id,artBase:w.ammo==='light'?'vehicle-machinegun':'tank-125'}));
// 四向宽门留足牵引通道，建筑均在道路侧面。
export const REGIONAL_SETTLEMENTS=REGIONAL_CAMPS.map(c=>({id:c.id,name:c.name,left:c.x-450,right:c.x+450,top:c.y-450,bottom:c.y+450,gates:['top','bottom','left','right'].map(side=>({side,at:side==='top'||side==='bottom'?c.x:c.y,width:360}))}));
// 地标、碰撞和交易面板使用相同地点。
const regionalServices={
 mossbrook:['水车图纸屋','溪谷机修棚','薄荷苗圃','溪岸补给仓','巡林伙伴屋'],
 emberforge:['铆钉模具铺','锻钢引擎厂','火山种子铺','赤炉弹药库','炉工宿舍'],
 snowcedar:['巡山邮局','雪地检修站','耐寒育苗屋','巡山补给仓','雪松队舍'],
 rainbell:['共鸣片工坊','雨林车辆整备站','雨林育种屋','雨季补给站','路铃守望屋'],
 stratacove:['岩层标本馆','勘测车修理厂','台地苗圃','勘探物资库','勘测队舍']
};
// 兼容已有房屋身份，每栋建筑的柜台直接打开对应服务。
export function regionalBuildings(c){
 const plan=[['store',c.house,-250,-180,'story'],['repair','weapons',250,-180,'repair'],['seed','seed',-250,205,'seed'],['supply','ammo',250,205,'supply'],['crew','cat-home',-205,360,'cat']];
 return plan.map(([id,kind,dx,dy,tab],i)=>({id:c.id+'-'+id,kind,x:c.x+dx,y:c.y+dy,label:regionalServices[c.id][i],tab}));
}
export function regionalNpc(c){return {x:c.x-95,y:c.y-70};}
export function regionalParcel(c){return {id:c.id+'-parcel',mapId:'forest',x:c.x+740,y:c.y+90,name:c.parcel};}
// 清除整个生活区和任务箱附近的树冠，外围仍保留森林。
export function regionalClearing(x,y){return REGIONAL_CAMPS.some(c=>Math.abs(x-c.x)<530&&Math.abs(y-c.y)<580||Math.hypot(x-regionalParcel(c).x,y-regionalParcel(c).y)<105);}

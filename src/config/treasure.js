// 遗失装备与埋藏点使用稳定编号；世界位置固定，每个存档只允许取走一次。
export const TREASURE_VEHICLES=[
 {id:'moss-sentinel',index:9,name:'苔原守望',shortName:'守望',description:'遗失的巡护坦克，窄履带与后置行李架，载重充裕；出土时已经报废，需要救援或牵引回厂。',baseHp:620,hpGrowth:70,speed:1.14,value:18000,rewardOnly:true},
 {id:'amber-bastion',index:10,name:'琥珀堡垒',shortName:'堡垒',description:'斜面装甲与双牵引钩的重型坦克，善于拖运重物；出土时已经报废，需要回厂修复。',baseHp:920,hpGrowth:120,speed:.9,value:32000,rewardOnly:true},
];
export const TREASURE_GUNS=[
 {id:'longbranch',weaponIndex:23,hullIndex:null,name:'长枝穿甲炮',description:'细长炮管配双支撑，能贯穿一列敌人；使用标准炮弹。',ammo:'shell',mass:280,damage:210,interval:1.9,range:720,speed:1200,pellets:1,spread:0,magazineSize:2,reloadTime:2.8,impulse:900,pierce:5,pierceDecay:.8,hitRadius:4,aimAssist:true,muzzle:82,color:'#dfdcaa',treasure:true},
 {id:'honeycomb',weaponIndex:24,hullIndex:null,name:'蜂巢散射炮',description:'宽口短炮一次散射七颗弹丸，近距离压制敌群；每次消耗一发重型炮弹。',ammo:'heavy',mass:520,damage:75,interval:2.6,range:410,speed:830,pellets:7,spread:.45,magazineSize:2,reloadTime:3.5,impulse:330,hitRadius:4,aimAssist:true,muzzle:48,color:'#edbd63',treasure:true},
];
export const TREASURE_ENGINES=[
 {id:'cedar-diesel',index:3,name:'杉木六缸柴油机',description:'竖列散热片与低转速大扭矩，适合远途运输。',payload:2,tow:1.9,speed:.92,mass:0,fixedMass:180,price:0,treasure:true},
 {id:'twin-heart',index:4,name:'双心涡轮发动机',description:'双缸头与双进气口，兼顾速度和牵引，机体较重。',payload:1.8,tow:2.1,speed:1.15,mass:0,fixedMass:260,price:0,treasure:true},
];
export const DETECTOR={price:180,mass:1.2,radius:300,digRadius:45};
export const TREASURE_SITES=[
 {id:'sentinel',title:'路肩下的履带',kind:'vehicle',index:9,x:2680,y:1500,region:{x:2660,y:1380},area:'东侧纵路·旧巡护路段',resident:'mint',speaker:'薄荷',request:'neighbors-market',step:1,clue:'东侧纵路往南走，过横路后第一段弯道，有两道一直没长草的车辙。松伯说那下面躺着一辆巡护车。'},
 {id:'longbranch',title:'树根旁的长箱',kind:'gun',index:23,x:2500,y:3300,region:{x:2540,y:3160},area:'东侧纵路·南部岔口以北',resident:'boar',speaker:'铁牙',clue:'我在东侧纵路南边搬过一个长铁箱，靠近通向古林的横岔路。后来落叶把箱子盖住了，里头大概是根炮管。',request:'neighbors-lunch',step:2},
 {id:'cedar',title:'不会生锈的嗡鸣',kind:'engine',index:3,x:5220,y:1600,region:{x:5230,y:1450},area:'古林西路·北段',resident:'snow',speaker:'雪团',request:'neighbors-night',step:1,clue:'古林最西边那条纵路，北段有块像散热片的铁角。我画过它，旁边的草被压成了长方形。'},
 {id:'bastion',title:'夜路尽头的琥珀',kind:'vehicle',index:10,x:7740,y:4600,region:{x:7800,y:4460},area:'古林中路·两条横路之间',resident:'owl',speaker:'枭爵',clue:'沿古林中间的纵路，在南北两条横路之间，夜里能看见一块金黄的甲板。我记得它前面有两个拖钩。',request:'neighbors-night',step:2},
 {id:'honeycomb',title:'七孔铁蜂巢',kind:'gun',index:24,x:10000,y:5300,region:{x:9970,y:5170},area:'远东纵路·南横路以北',resident:'bat',speaker:'小夜',request:'neighbors-night',step:5,clue:'最东边那条路，靠近南横路的地方，我落脚时碰到过七个圆孔。不是蜂窝，是个沉沉的铁炮口。'},
 {id:'twin-heart',title:'双圆盖的旧机器',kind:'engine',index:4,x:5240,y:6500,region:{x:5200,y:6360},area:'古林西路·南横路以南',resident:'cook',speaker:'阿团',clue:'古林西路过了南横路继续走，有台露出两个圆盖的机器。别拿它当锅，我试过，里面全是齿轮。',request:'neighbors-market',step:0},
].map(s=>Object.freeze({...s,mapId:'forest'}));
// 部件身份独立于所在车辆，搬运和安装移动同一件实物，不复制奖励。
export function treasurePartKey(kind,index){return kind+':'+index;}
export const TREASURE_PARTS=[...TREASURE_GUNS.map(g=>({id:'gun:'+g.weaponIndex,index:g.weaponIndex,kind:'gun',name:g.name,mass:g.mass,description:g.description})),...TREASURE_ENGINES.map(e=>({id:'engine:'+e.index,index:e.index,kind:'engine',name:e.name,mass:e.fixedMass,description:e.description}))];

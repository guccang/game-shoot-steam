// 升阶车型只追加在旧十一辆之后。货重、配方和座位均按稳定车型绑定。
export const ERA_FIRST = 11;
export const HORSE_PRICE = 180;
export const ERA_RESOURCES = {
  copper: {name:'铜料',source:'在地下一层挖矿可获得铜料。'},
  iron: {name:'铁料',source:'在地下二层挖矿可获得铁料。'},
  rareMetal: {name:'稀有金属',source:'在地下三层及更深处挖矿可获得稀有金属。'},
  draftHorse: {name:'挽马',source:'走到营地牧栏门口，领养一匹挽马后去工坊套车。'},
};
// 车体静重与额定货载分别计量；座位使用250单位原画的车把或车斗前缘。
// 世界缩放以原有电动车和独轮车为参照，轻型自行车窄小，货车与平台保留更宽的轮廓。
export const ERA_VEHICLES = [
 {id:'wood-barrow',worldScale:.65,name:'木制独轮手推车',mass:18,payload:60,cost:{wood:24},edge:59,neck:37,width:74,wheels:[[125,196]]},
 {id:'copper-barrow',worldScale:.68,name:'铜轴独轮手推车',from:'wood-barrow',mass:30,payload:100,cost:{wood:12,copper:8},edge:54,neck:31,width:72,wheels:[[125,202]]},
 {id:'wood-wagon',worldScale:.74,name:'双轮木马车',from:'copper-barrow',mass:150,payload:180,cost:{wood:48,draftHorse:1},edge:65,neck:43,width:62,wheels:[[40,163],[210,163]],horse:{baseline:235,scale:1.29}},
 {id:'copper-wagon',worldScale:.78,name:'铜箍货运马车',from:'wood-wagon',mass:220,payload:300,cost:{wood:20,copper:24},edge:94,neck:71,width:64,wheels:[[39,175],[211,175]],horse:{baseline:239,scale:1.13}},
 {id:'steam-freighter',worldScale:.78,motorSound:4,name:'蒸汽货车',from:'copper-wagon',mass:720,payload:500,cost:{iron:28,copper:12,parts:10},edge:81,neck:57,width:65,wheels:[[65,209],[184,209]]},
 {id:'combustion-freighter',worldScale:.82,motorSound:7,name:'内燃货车',from:'steam-freighter',mass:1050,payload:800,cost:{iron:40,parts:22,core:1},edge:150,neck:121,width:67,bend:-15,wheels:[[64,219],[187,219]]},
 {id:'electric-freighter',worldScale:.84,motorSound:5,name:'电驱货车',from:'combustion-freighter',mass:1250,payload:1000,cost:{copper:32,iron:24,crystal:12},edge:140,neck:111,width:67,bend:-15,wheels:[[47,217],[206,217]]},
 {id:'gravity-freighter',worldScale:.86,motorSound:3,name:'反重力运输平台',from:'electric-freighter',mass:1400,payload:1600,amphibious:true,cost:{rareMetal:30,crystal:25,core:4},edge:151,neck:125,width:67,bend:5,wheels:[]},
 {id:'wood-bicycle',worldScale:.68,name:'木制自行车',mass:14,payload:10,cost:{wood:16},edge:108,neck:77,width:76,bend:-3,feet:[82,168,193],wheels:[[125,219]]},
 {id:'copper-bicycle',worldScale:.69,name:'铜制自行车',from:'wood-bicycle',mass:19,payload:20,cost:{copper:8,wood:8},edge:84,neck:55,width:74,bend:2,feet:[74,177,168],wheels:[[125,211]]},
 {id:'iron-bicycle',worldScale:.71,name:'铁制自行车',from:'copper-bicycle',mass:22,payload:35,cost:{iron:14,parts:4},edge:88,neck:58,width:76,bend:12,feet:[84,165,181],wheels:[[125,208]]},
 {id:'assist-bicycle',worldScale:.73,motorSound:5,name:'电动自行车',from:'iron-bicycle',mass:32,payload:50,cost:{copper:10,iron:8,crystal:6},edge:88,neck:59,width:73,bend:6,feet:[82,167,171],wheels:[[125,207]]},
].map((v,i)=>({...v,index:ERA_FIRST+i,shortName:v.name,unarmed:true,tow:Math.floor(v.payload*.7),description:v.name+'，额定货载 '+v.payload+' 千克，驾驶时可使用手持武器。'}));
// 将原画坐标转换为世界单位，车轮、遮挡线和骑手锚点共用。
export function eraHullScale(model){return 44/model.width*(model.worldScale??1);}
// 旧车型返回空，避免特殊载具规则误命中。
export function eraVehicle(index){return ERA_VEHICLES[index-ERA_FIRST];}
// 通过稳定标识查原车，库存存档仍以已有数字槽位保存。
export function eraDonor(model){return model?.from?ERA_VEHICLES.find(v=>v.id===model.from):null;}

// 人力和畜力车没有引擎，动力车按动力类型复用声音。
export function vehicleMotorSound(index){
 const model=eraVehicle(index);
 return model?(model.motorSound??-1):index;
}

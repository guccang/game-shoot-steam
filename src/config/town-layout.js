// 晴叶小镇统一规划：地点、支路与院落共用世界坐标，稳定入口身份不随搬迁改变。
// 营地和邻里共同西移，所有附属设施从同一位移派生。
export const TOWN_SHIFT_X=-300;
export const TOWN_LAYOUT_VERSION=1;
// 将原规划点平移到新营地，保留其他字段及局部相对尺寸。
export function townPoint(point){return {...point,x:point.x+TOWN_SHIFT_X};}
export const TOWN_LAYOUT = {
  spawn: {x:900,y:700},
  neighborsPost: {x:650,y:1800},
  race: {x:510,y:1100},
  football: {x:470,y:1350},
  travel: {x:1040,y:690},
  bounds: {left:-820,right:1090,top:-58,bottom:1400},
  refinery: {x:-650,y:300,width:200,height:140},
  factory: {x:-650,y:650,width:200,height:140},
  weapons: {x:350,y:570,width:150,height:135,scale:.95},
  garage: {x:350,y:990,width:220,height:175},
  outdoor: {x:-140,y:300,width:220,height:175},
  ammo: {x:-140,y:570,width:220,height:175},
  repair: {x:-140,y:930,width:220,height:175},
  cottage: {x:850,y:300},
  construction: {x:1015,y:510},
  warehouseDepot: {x:520,y:128,width:182,height:101},
  warehouse: {x:585,y:300,width:144,height:124},
  catHome: {x:580,y:780,width:144,height:132},
  furniture: {x:570,y:550,width:136,height:120},
  letters: {x:900,y:490},
  story: {x:820,y:880},
  clearing: {x:1000,y:990},
  supply: {x:865,y:1080},
  guardian: {x:330,y:1260},
  rogue: {x:760,y:1260},
  tower: {x:1000,y:1260},
  tent: {x:510,y:920},
};
// 边界也随主体平移；负坐标由世界周期几何统一处理。
for(const [id,p] of Object.entries(TOWN_LAYOUT))TOWN_LAYOUT[id]=id==='bounds'?{...p,left:p.left+TOWN_SHIFT_X,right:p.right+TOWN_SHIFT_X}:townPoint(p);
// 小径端点与原纵路相接；车位判断仍只使用原干道，不把院内支路误判为禁停区。
export const TOWN_PATHS = [
  [{x:-650,y:365},{x:-340,y:365}],
  [{x:-650,y:365},{x:-490,y:365},{x:-490,y:715},{x:-650,y:715}],
  [{x:-490,y:715},{x:-340,y:729}],
  // 建筑公司支路连接小屋院前，不占用原停车位。
  [{x:1015,y:560},{x:1050,y:560},{x:1050,y:729}],
  [{x:-140,y:365},{x:-340,y:365},{x:-340,y:729}],
  [{x:585,y:365},{x:677,y:365}],
  [{x:-140,y:635},{x:-340,y:635},{x:-340,y:729}],
  [{x:580,y:840},{x:690,y:840}],
  // 家具小店连接主路，避开北停车场和武器工坊的正门。
  [{x:570,y:610},{x:690,y:610}],
  // 西侧整备区连到横向主路及原车库院落，门前留出倒车通道。
  [{x:-340,y:729},{x:-340,y:1060},{x:-140,y:1060},{x:350,y:1065}],
  [{x:850,y:365},{x:750,y:365},{x:677,y:360}],
  [{x:900,y:535},{x:775,y:535},{x:690,y:540}],
  [{x:350,y:650},{x:520,y:650},{x:694,y:640}],
  [{x:350,y:1065},{x:500,y:1065},{x:675,y:1060}],
  [{x:681,y:980},{x:820,y:980},{x:1000,y:1040}],
  [{x:820,y:925},{x:820,y:980},{x:865,y:1100}],
  [{x:330,y:1325},{x:460,y:1340},{x:639,y:1340},{x:760,y:1340},{x:1000,y:1325}],
].map(path=>path.map(townPoint));
// 铺地只覆盖各自门前，中央纵横主路与麦田仍有连续的草地间隔。
export const TOWN_COURTS = [
  {id:'construction-yard',x:930,y:515,w:160,h:50,material:'earth'},
  {id:'warehouse-loading-yard',x:467,y:128,w:112,h:40,material:'earth'},
  {id:'warehouse-yard',x:520,y:305,w:140,h:75,material:'earth'},
  {id:'cat-home-yard',x:505,y:785,w:150,h:65,material:'earth'},
  {id:'furniture-yard',x:495,y:555,w:150,h:65,material:'earth'},
  {id:'repair-yard',x:-380,y:900,w:480,h:235,material:'earth'},
  {id:'weapons-yard',x:245,y:590,w:225,h:95,material:'earth'},
  {id:'garage-yard',x:225,y:970,w:285,h:135,material:'earth'},
  {id:'task-square',x:735,y:900,w:325,h:190,material:'stone'},
  {id:'guardian-court',x:235,y:1255,w:195,h:95,material:'stone'},
  {id:'expedition-court',x:680,y:1255,w:160,h:95,material:'stone'},
  {id:'tower-court',x:925,y:1255,w:145,h:95,material:'stone'},
].map(townPoint);
export const TOWN_SIGNS = [
  {id:'repair-district',x:-310,y:785,label:'维修整备区'},
  {id:'home',x:735,y:285,label:'生活区'},
  {id:'workshops',x:470,y:720,label:'整备区'},
  {id:'tasks',x:745,y:850,label:'任务广场'},
  {id:'challenges',x:560,y:1260,label:'挑战庭院'},
].map(sign=>({type:'scenery',kind:'district-sign',size:1,...townPoint(sign)}));

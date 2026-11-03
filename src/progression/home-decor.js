// 小屋家具存档与摆放几何共用规则；非法位置转入收纳，不丢失已购家具。
import {homeFloors,HOME_ELEVATOR,HOME_DIRECTIONS,elevatorFloors,hasHomeElevator} from '../config/home-construction.js';
import {HOME_STARTERS,HOME_LIMIT,HOME_PLANTS,decorDefinition} from '../config/home-decor.js';
import {COTTAGE,COTTAGE_FURNITURE,COTTAGE_STAIRS} from '../config/cottage.js';
import {LIVING_DAY_MS} from '../config/living-world.js';

// 新小屋默认两层和四件家具，新增楼层只保存实际摆放的内容。
export function freshHome(){return {version:2,floors:2,elevators:[],balconies:{},nextId:5,items:HOME_STARTERS.map((d,i)=>({uid:i+1,type:d.id,x:d.x,y:d.y,plant:null,floor:0,weapons:[]}))};}
// 只把有合法落点的家具送入场景，宽高始终来自正式配置。
export function placedDecor(home,floor=0){return (home?.items||[]).filter(i=>(i.floor||0)===floor&&Number.isFinite(i.x)&&Number.isFinite(i.y)&&decorDefinition(i.type)).map(i=>({...decorDefinition(i.type),...i}));}
// 原床固定保留；挂件与地毯不阻挡脚底。
export function homeFurniture(home,floor=0){return [...(floor===0?[COTTAGE_FURNITURE[0]]:[]),hasHomeElevator(home,floor)?HOME_ELEVATOR:COTTAGE_STAIRS,...placedDecor(home,floor).filter(i=>i.layer==='floor')];}
// 家具碰撞与正式室内行走一致，给猫身体预留十个逻辑单位。
function blocked(x,y,furniture){return x<22||x>COTTAGE.width-22||y<76||y>COTTAGE.height-20||furniture.some(f=>Math.abs(x-f.x)<f.width/2+10&&Math.abs(y-f.y)<f.height/2+10);}
// 从门内落点寻路到床边和出口，拒绝把小屋隔成无法通行的区域。
function hasPath(furniture,player,floor){
 const start=COTTAGE.spawn,queue=[[start.x,start.y]],seen=new Set([start.x+','+start.y]);let bed=floor>0,exit=floor>0,stairs=false,reachable=!player;
 const access=[COTTAGE_STAIRS.downLanding,...Object.values(HOME_DIRECTIONS).map(d=>d.door)],reached=new Set();
 if(blocked(start.x,start.y,furniture))return false;
 for(let n=0;n<queue.length;n++){
  const [x,y]=queue[n];for(let i=0;i<access.length;i++)if(Math.hypot(x-access[i].x,y-access[i].y)<=28)reached.add(i);if(Math.hypot(x-119,y-158)<18)bed=true;if(Math.hypot(x-COTTAGE.exit.x,y-COTTAGE.exit.y)<18)exit=true;if(Math.hypot(x-COTTAGE_STAIRS.landing.x,y-COTTAGE_STAIRS.landing.y)<18)stairs=true;if(player&&Math.hypot(x-player.x,y-player.y)<18)reachable=true;if(bed&&exit&&stairs&&reachable&&reached.size===access.length)return true;
  for(const [dx,dy] of [[12,0],[-12,0],[0,12],[0,-12]]){const xx=x+dx,yy=y+dy,key=xx+','+yy;if(!seen.has(key)&&!blocked(xx,yy,furniture)){seen.add(key);queue.push([xx,yy]);}}
 }
 return false;
}
// 返回中文失败原因，供预览、提交及存档修复共同使用。
export function placementError(home,uid,x,y,player,floor=0){
 if(!Number.isSafeInteger(floor)||floor<0||floor>=homeFloors(home))return '请先加盖这一层。';
 const item=home.items.find(i=>i.uid===uid),d=decorDefinition(item?.type);
 if(!d||!Number.isFinite(x)||!Number.isFinite(y))return '请选择家具和位置。';
 if(d.layer==='curtain'){if(y!==46||![81,271].includes(x))return '窗帘只能挂在左右两扇窗上。';}
 else if(d.layer==='wall'){if(y!==46||x-d.width/2<119||x+d.width/2>233)return '壁画和挂钟请放在两扇窗之间。';}
 else if(x-d.width/2<18||x+d.width/2>COTTAGE.width-18||y-d.height/2<86||y+d.height/2>COTTAGE.height-80)return '请放在木地板内，并留出门口。';
 const other=placedDecor(home,floor).filter(i=>i.uid!==uid),same=other.filter(i=>i.layer===d.layer);
 if(same.some(i=>Math.abs(x-i.x)<(d.width+i.width)/2+2&&Math.abs(y-i.y)<(d.height+i.height)/2+2))return '这里已有家具，请换个位置。';
 if(d.layer==='floor'){
  const f={...d,x,y},bed=COTTAGE_FURNITURE[0],stairs=COTTAGE_STAIRS;
  if(floor===0&&Math.abs(x-bed.x)<(d.width+bed.width)/2+2&&Math.abs(y-bed.y)<(d.height+bed.height)/2+2)return '请留出床的位置。';
  if(player&&blocked(player.x,player.y,[f]))return '这里是猫猫站的位置，请先挪开家具。';
  if(Math.abs(x-stairs.x)<(d.width+stairs.width)/2+8&&Math.abs(y-stairs.y)<(d.height+stairs.height)/2+28)return '请留出楼梯和楼梯前的通道。';
  // 电梯共用梯位，北侧下楼落点与四向阳台门都须保持可达。
  if(Object.values(HOME_DIRECTIONS).some(({door})=>Math.abs(x-door.x)<d.width/2+30&&Math.abs(y-door.y)<d.height/2+30))return '请留出阳台门通道。';
  if(!hasPath([...(floor===0?[bed]:[]),hasHomeElevator(home,floor)?HOME_ELEVATOR:stairs,...other.filter(i=>i.layer==='floor'),f],player,floor))return '请留出通往床边、楼梯和门口的路。';
 }
 return '';
}
// 游戏历法为唯一成长时钟，巡林和睡眠推进，离线不额外补时。
export function homeTime(calendar){return Math.max(0,calendar?.day||0)*LIVING_DAY_MS+Math.max(0,calendar?.elapsed||0);}
// 盆栽只有空盆、幼苗、生长和成熟阶段，成熟可留作装饰。
export function plantState(item,calendar){
 const plant=HOME_PLANTS.find(p=>p.id===item?.plant?.id);if(!plant)return {plant:null,ratio:0,ready:false,label:'空花盆'};
 // 生长天数按清晨换日计算，当天播种的一天作物在明早成熟。
 const readyAt=(Math.floor(item.plant.started/LIVING_DAY_MS)+plant.days)*LIVING_DAY_MS;
 const ratio=Math.max(0,Math.min(1,(homeTime(calendar)-item.plant.started)/Math.max(1,readyAt-item.plant.started)));
 return {plant,ratio,ready:ratio>=1,label:ratio>=1?'已成熟，可采收':`${ratio<.5?'幼苗':'生长中'} · ${Math.floor(ratio*100)}%`};
}
// 防止未知类型、重复实例及损坏坐标污染正式绘制与购买上限。
export function normalizeHome(raw,calendar){
 if(!raw||!Array.isArray(raw.items))return freshHome();
 const home={version:2,floors:homeFloors(raw),elevators:elevatorFloors(raw),balconies:{},nextId:1,items:[]},seen=new Set(),now=homeTime(calendar);
 for(const [key,sides] of Object.entries(raw.balconies||{})){const floor=Number(key);if(Number.isSafeInteger(floor)&&floor>=0&&floor<home.floors&&Array.isArray(sides))home.balconies[floor]=[...new Set(sides.filter(d=>Object.hasOwn(HOME_DIRECTIONS,d)))];}
 for(const source of raw.items.slice(0,HOME_LIMIT*home.floors)){
  if(!source||!decorDefinition(source.type)||!Number.isSafeInteger(source.uid)||source.uid<1||source.uid>1000000000||seen.has(source.uid))continue;
  seen.add(source.uid);const item={uid:source.uid,type:source.type,x:null,y:null,plant:null,floor:Number.isSafeInteger(source.floor)&&source.floor>=0&&source.floor<home.floors?source.floor:0,weapons:source.type==='weapon-rack'&&Array.isArray(source.weapons)?source.weapons.slice(0,3).filter(Number.isInteger):[]};
  if(source.type==='pot'&&HOME_PLANTS.some(p=>p.id===source.plant?.id)&&Number.isFinite(source.plant.started)&&source.plant.started>=0)item.plant={id:source.plant.id,started:Math.min(now,source.plant.started)};
  home.items.push(item);
  if(source.x!==null&&source.y!==null&&!placementError(home,item.uid,source.x,source.y,null,item.floor)){item.x=source.x;item.y=source.y;}
 }
 home.nextId=home.items.reduce((n,i)=>Math.max(n,i.uid+1),1);return home;
}

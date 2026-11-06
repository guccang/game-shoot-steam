import {validOre,CART_CAPACITY} from '../config/mine-freight.js';
import {railExits,cartOnSegment} from '../config/mine-rail-routes.js';
import {createMineGeography} from '../config/mine-ecology.js';
import {normalizeLayerEcology} from './mine-layers.js';
// 地下独立存档包含矿石、已开掘网格、轨道、摆件、洞口和真实矿车。
import {mineKey,minePoint,mineCell} from '../config/mining.js';
// 新玩家自带矿锄，地下室施工后才开放开掘入口。
export function freshMining(){return {version:2,layers:{},bridges:{},harvested:{},animals:{},age:0,entry:'0,0',descent:null,seed:0,pickaxe:true,bagOre:{},ore:0,dug:{},rails:{},junctions:{},decor:{},shafts:[],carts:[],nextCart:1};}
// 坐标使用安全整数并预留世界单位乘法空间，防止损坏存档造成无限循环。
function validKey(key){return /^-?\d+,-?\d+$/.test(key)&&key.split(',').every(n=>Number.isSafeInteger(Number(n))&&Math.abs(Number(n))<1e10)&&key===mineKey(Object.fromEntries(key.split(',').map((v,i)=>[i?'y':'x',Number(v)])));}
// 只恢复已挖空格内的设施，车体不得落在墙里；旧存档自动获得工具。
export function normalizeMining(raw,depth=1){
 const m=freshMining();if(!raw||![1,2].includes(raw.version))return m;
 m.bagOre=validOre(raw.bagOre);
 m.ore=Number.isSafeInteger(raw.ore)?Math.max(0,raw.ore):0;
 for(const key of Object.keys(raw.dug||{}))if(validKey(key)&&raw.dug[key]===true)m.dug[key]=true;
 for(const key of Object.keys(raw.rails||{}))if(Object.hasOwn(m.dug,key)&&raw.rails[key]===true)m.rails[key]=true;
 for(const [key,value] of Object.entries(raw.decor||{}))if(Object.hasOwn(m.dug,key)&&['lamp','sign'].includes(value))m.decor[key]=value;
 const shafts=new Set();for(const key of Array.isArray(raw.shafts)?raw.shafts:[])if(Object.hasOwn(m.dug,key)&&!shafts.has(key)){shafts.add(key);m.shafts.push(key);}
 // 路口必须有三个以上出口，丢弃损坏方向；旧档缺少设置时沿用自动选路。
 for(const [key,direction] of Object.entries(raw.junctions||{})){
  const exits=railExits(m,key);if(exits.length>=3&&exits.some(n=>n.i===direction))m.junctions[key]=direction;
 }
 const ids=new Set();for(const cart of Array.isArray(raw.carts)?raw.carts:[]){
  if(!Number.isSafeInteger(cart?.id)||cart.id<1||ids.has(cart.id)||!Number.isFinite(cart.x)||!Number.isFinite(cart.y)||!m.rails[mineKey(mineCell(cart))])continue;
  const point=minePoint(mineCell(cart)),segment=cartOnSegment(m,cart),key=mineKey(mineCell(cart)),exits=railExits(m,key);
  const heading=Number.isInteger(cart.heading)&&cart.heading>=0&&cart.heading<4?cart.heading:1;
  ids.add(cart.id);m.carts.push({id:cart.id,cargo:validOre(cart.cargo,CART_CAPACITY),leader:Number.isSafeInteger(cart.leader)?cart.leader:null,...(segment?{x:cart.x,y:cart.y}:point),previous:exits.some(n=>n.key===cart.previous)?cart.previous:null,from:segment?cart.from:null,target:segment?cart.target:null,heading,departure:!segment&&exits.some(n=>n.i===cart.departure)?cart.departure:null,wheel:Number.isFinite(cart.wheel)?cart.wheel%(Math.PI*2):0,lubrication:Number.isFinite(cart.lubrication)?Math.max(0,Math.min(180,cart.lubrication)):0});
 }
 // 无效、分叉或循环挂钩不能从损坏存档复活。
 const parents=new Map(),used=new Set();
 for(const c of m.carts){
  let id=c.leader;while(parents.has(id))id=parents.get(id);
  if(!ids.has(c.leader)||id===c.id||used.has(c.leader)){c.leader=null;continue;}
  parents.set(c.id,c.leader);used.add(c.leader);
 }
 m.nextCart=m.carts.reduce((n,c)=>Math.max(n,c.id+1),1);normalizeLayerEcology(m,raw,depth);
 // 尚未施工的一层保持未生成；旧版已有矿道使用固定迁移种子，绝不重排。
 if(depth===1&&raw.seed===0&&!Object.keys(m.dug).length){m.seed=0;delete m.bounds;delete m.coverage;}
 // 按已存层号迭代恢复全部连续层，不预生成深层，也不按最大层号遍历空洞。
 if(depth===1){
  const depths=Object.keys(raw.layers||{}).filter(key=>Number.isSafeInteger(Number(key))&&Number(key)>=2&&String(Number(key))===key).map(Number).sort((a,b)=>a-b);
  let expected=2;for(const d of depths){if(d!==expected||!raw.layers[d]||typeof raw.layers[d]!=='object')break;m.layers[d]=normalizeMining({...raw.layers[d],version:2},d);expected++;}
 }
 return m;
}
// 施工只开通小屋正下方九格，空格不产矿，防止重复施工刷取。
export function openBasement(m){if(!m.seed)Object.assign(m,createMineGeography(1));for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)m.dug[mineKey({x,y})]=true;}

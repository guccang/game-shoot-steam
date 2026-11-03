// 地下独立存档包含矿石、已开掘网格、轨道、摆件、洞口和真实矿车。
import {mineKey,minePoint,mineCell} from '../config/mining.js';
// 新玩家自带矿锄，地下室施工后才开放开掘入口。
export function freshMining(){return {version:1,pickaxe:true,ore:0,dug:{},rails:{},decor:{},shafts:[],carts:[],nextCart:1};}
// 坐标使用安全整数并预留世界单位乘法空间，防止损坏存档造成无限循环。
function validKey(key){return /^-?\d+,-?\d+$/.test(key)&&key.split(',').every(n=>Number.isSafeInteger(Number(n))&&Math.abs(Number(n))<1e10)&&key===mineKey(Object.fromEntries(key.split(',').map((v,i)=>[i?'y':'x',Number(v)])));}
// 只恢复已挖空格内的设施，车体不得落在墙里；旧存档自动获得工具。
export function normalizeMining(raw){
 const m=freshMining();if(!raw||raw.version!==1)return m;
 m.ore=Number.isSafeInteger(raw.ore)?Math.max(0,raw.ore):0;
 for(const key of Object.keys(raw.dug||{}))if(validKey(key)&&raw.dug[key]===true)m.dug[key]=true;
 for(const key of Object.keys(raw.rails||{}))if(Object.hasOwn(m.dug,key)&&raw.rails[key]===true)m.rails[key]=true;
 for(const [key,value] of Object.entries(raw.decor||{}))if(Object.hasOwn(m.dug,key)&&['lamp','sign'].includes(value))m.decor[key]=value;
 const shafts=new Set();for(const key of Array.isArray(raw.shafts)?raw.shafts:[])if(Object.hasOwn(m.dug,key)&&!shafts.has(key)){shafts.add(key);m.shafts.push(key);}
 const ids=new Set();for(const cart of Array.isArray(raw.carts)?raw.carts:[]){
  if(!Number.isSafeInteger(cart?.id)||cart.id<1||ids.has(cart.id)||!Number.isFinite(cart.x)||!Number.isFinite(cart.y)||!m.rails[mineKey(mineCell(cart))])continue;
  const point=minePoint(mineCell(cart));ids.add(cart.id);m.carts.push({id:cart.id,...point,previous:null,wheel:0});
 }
 m.nextCart=m.carts.reduce((n,c)=>Math.max(n,c.id+1),1);return m;
}
// 施工只开通小屋正下方九格，空格不产矿，防止重复施工刷取。
export function openBasement(m){for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)m.dug[mineKey({x,y})]=true;}

// 远林采用错行营地，各自继承原营地的物资和混编；坐标和标识在读档时可复现。
import {worldDistance} from '../world/coordinates.js';
const ridges=['桦影','青苔','白石','赤枫','杉针','浅溪','夜露','长风','暮云','橡果','栖鸦','落星'];
const sites=['坡','台','坳','岗','渡','岭','谷','崖','湾','坪','岗哨','山麓','驿','林场','隘口'];

// 每格约320×300米；旧营地周围保留原密度，避开南北河道和主营地出入口。
export function frontierCamps(existing){
 const forest=existing.filter(c=>c.mapId==='forest');
 const camps=[{...forest[0],parentId:forest[0].id,id:'north-sapling',name:'嫩芽营地',x:250,y:34900}];
 for(let row=0;row<12;row++)for(let col=0;col<15;col++){
  const x=col*3200+(row%2?2300:650),y=row*3000+900;
  if(x<1600||worldDistance({x,y},{x:0,y:700})<2500||forest.some(c=>worldDistance(c,{x,y})<2000))continue;
  const parent=forest[(row*3+col)%7];
  camps.push({...parent,parentId:parent.id,id:'frontier-'+row+'-'+col,name:ridges[row]+sites[col]+'营地',x,y});
 }
 return camps;
}

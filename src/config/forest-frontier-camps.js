// 远林优先在林缘和相邻驿点附近扎营。旧行列号只用于继承存档和物资。
import {worldDistance,canonical} from '../world/coordinates.js';
import {forestHabitat} from '../world/forest-habitats.js';
import {pathDistance} from '../world/paths.js';
import {forestThreatAt} from '../world/forest-levels.js';
const ridges=['桦影','青苔','白石','赤枫','杉针','浅溪','夜露','长风','暮云','橡果','栖鸦','落星'];
const sites=['坡','台','坳','岗','渡','岭','谷','崖','湾','坪','岗哨','山麓','驿','林场','隘口'];
// 这些编号从未颁发；近郊据点日后搬动也不能增加或删除已有远林存档键。
const unusedColumns=[[0,1,2,3,14],[0,1,2,14],[0,2,3],[],[0],[],[0,7],[],[0],[],[0],[]];

// 固定采样次序只服务于地形布局，不占用战斗随机流。
function fraction(seed){const value=Math.sin(seed*78.233)*43758.5453;return value-Math.floor(value);}
// 从旧营地周边选择新址。林缘岗哨成串，深林腹地和开阔草甸之间留出探索空档。
function chooseSite(origin,seed,placed){
 let best={x:origin.x,y:origin.y},bestScore=-Infinity;
 const tier=forestThreatAt(origin.x,origin.y).level;
 for(let i=0;i<60;i++){
  const a=fraction(seed*113+i)*2*Math.PI,r=500+Math.sqrt(fraction(seed*193+i+9))*4700;
  const p=canonical({x:Math.round(origin.x+Math.cos(a)*r),y:Math.round(origin.y+Math.sin(a)*r)});
  if(p.x<2100||(p.x<10800&&p.y<8400)||worldDistance(p,{x:0,y:700})<3400||pathDistance(p.x,p.y)<320)continue;
  // 最高两级只占地图很小一角，移位时保住原本稀少的据点。
  if(tier>=19&&forestThreatAt(p.x,p.y).level!==tier)continue;
  const nearest=Math.min(...placed.map(c=>worldDistance(c,p)));
  if(nearest<1280)continue;
  const {strength}=forestHabitat(p.x,p.y);
  const edge=Math.exp(-Math.pow((strength-.33)/.24,2));
  const neighbor=Math.exp(-Math.pow((nearest-1750)/850,2));
  const score=edge+neighbor*.9+fraction(seed+i*11)*.55;
  if(score>bestScore){best=p;bestScore=score;}
 }
 return best;
}

// 沿用最初颁发的编号；每个营址都避开既有据点和之后仍需安置的保底点。
export function frontierCamps(existing){
 const forest=existing.filter(c=>c.mapId==='forest');
 const camps=[{...forest[0],parentId:forest[0].id,id:'north-sapling',name:'嫩芽营地',x:250,y:34900}];
 const slots=[];
 for(let row=0;row<12;row++)for(let col=0;col<15;col++){
  const x=col*3200+(row%2?2300:650),y=row*3000+900;
  if(unusedColumns[row].includes(col))continue;
  slots.push({row,col,x,y});
 }
 for(const [i,slot] of slots.entries()){
  const {row,col}=slot,parent=forest[(row*3+col)%7];
  const position=chooseSite(slot,i+1,[...forest,...camps,...slots.slice(i+1)]);
  camps.push({...parent,parentId:parent.id,id:'frontier-'+row+'-'+col,name:ridges[row]+sites[col]+'营地',...position});
 }
 return camps;
}

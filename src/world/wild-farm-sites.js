// 大世界野田候选沿既有道路分区采样，独立随机流避免影响战斗和掉落结果。
import {WILD_FARM_SCATTER as C} from '../config/wild-farm.js';
import {PATHS} from './paths.js';
import {WORLD} from './coordinates.js';

// 同一版本可复现选址与作物；存档保存最终落点，后续不会重新掷骰。
export function* wildFarmCandidates(){
 let seed=C.seed;
 // 局部线性随机序列只负责空地与首茬作物，不调用游戏战斗随机数。
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const roads=PATHS.flatMap(path=>path.slice(1).map((p,i)=>({x:p.x,y:p.y,dx:p.x-path[i].x,dy:p.y-path[i].y})));
 for(let row=0;row<C.rows;row++)for(let col=0;col<C.columns;col++){
  const left=col*WORLD.width/C.columns,right=(col+1)*WORLD.width/C.columns,top=row*WORLD.height/C.rows,bottom=(row+1)*WORLD.height/C.rows;
  const anchors=roads.filter(p=>p.x>left+70&&p.x<right-70&&p.y>top+70&&p.y<bottom-70);
  const candidates=[];
  for(let attempt=0;attempt<C.attempts&&anchors.length;attempt++){
   const p=anchors[Math.floor(random()*anchors.length)],offset=(C.minRoadOffset+random()*(C.maxRoadOffset-C.minRoadOffset))*(random()<.5?-1:1),length=Math.hypot(p.dx,p.dy)||1;
   const x=Math.round(p.x-p.dy/length*offset),y=Math.round(p.y+p.dx/length*offset);
   if(x<left+30||x>right-90||y<top+80||y>bottom-100)continue;
   candidates.push({x,y,size:2,road:{x:p.x,y:p.y},crops:Array.from({length:4},()=>C.crops[Math.floor(random()*C.crops.length)])});
  }
  yield candidates;
 }
}

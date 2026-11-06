// 公交亭周边的树丛、花带与石头依附棚脚定位，跨越北侧接缝时沿用正式世界坐标。
import {RANGER} from '../config/ranger-arrival.js';
import {canonical} from './coordinates.js';

// 把候车亭局部坐标转为森林布局使用的标准坐标。
function stopPoint(dx,dy){return canonical({x:RANGER.busStop.x+dx,y:RANGER.busStop.y+dy});}

// 左侧老树衬出候车亭，弯道对面以一高一低的树组收边，树干退到车道之外。
export const BUS_STOP_TREES=[
 [-126,8,.94],[-192,-38,.72],[-149,133,.73],
 [226,2,.86],[292,-22,.68],[203,116,.75],
].map(([dx,dy,size])=>({...stopPoint(dx,dy),size}));

// 石组靠树根落地，低花丛沿路疏密相间，站牌与接客点前方保留通路。
export const BUS_STOP_PROPS=[
 ['stones',-94,-21,.65],['flowers',-84,17,.84],['flowers',-59,29,.51],
 ['flowers',-32,-126,.65],['stones',207,24,.78],['flowers',187,38,.72],
 ['flowers',-122,116,.59],
].map(([kind,dx,dy,size])=>({type:'scenery',kind,size,...stopPoint(dx,dy)}));

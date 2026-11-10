// 守门战使用当前地契外轮廓与门位，站牌搬迁不改变真实防线。
import {CAMP_GATES} from '../config/camp-defense.js';
import {campBoundary} from './camp-boundary.js';
import {campPlotAt,ownsCampPlot} from '../config/camp-land.js';
// 同方向有多个门时选择最外侧防线，同一边优先保留原营门附近的入口。
export function currentCampDefenseGate(progress,id){const base=CAMP_GATES.find(g=>g.id===id);if(!base)return null;const candidates=campBoundary(progress).gates.filter(g=>g.side===id&&g.settlement==='sunleaf'&&ownsCampPlot(progress,campPlotAt({x:g.x-base.nx*50,y:g.y-base.ny*50},progress)?.id));candidates.sort((a,b)=>id==='top'?a.y-b.y||Math.abs(a.x-base.x)-Math.abs(b.x-base.x):a.x-b.x||Math.abs(a.y-base.y)-Math.abs(b.y-base.y));const gate=candidates[0];return gate?{...base,x:gate.x,y:gate.y,boundaryId:gate.id}:null;}

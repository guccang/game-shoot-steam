// 默认设施一次性入库，回收后不再生成；存档升级和购地共用。
import {TOWN_SIGNS} from '../../config/town-layout.js';
import {CAMP_BUILDINGS,campBuildingPosition} from '../../config/camp-layout.js';
import {campPlotAt,ownsCampPlot} from '../../config/camp-land.js';
import {campRoadLights} from '../../world/camp-lighting.js';
import {LIGHT_FIXTURES} from '../../world/lighting.js';
const signs=TOWN_SIGNS.map(s=>({...s}));
// 首次恢复保留当前布局位置，新地契只授予该区域设施。
export function grantDefaultCampDecor(progress,plotId=null){
 const state=progress.campManagement;if(state.defaultDecorVersion&&!plotId)return progress;
 const allowed=p=>{const plot=campPlotAt(p);return plot&&ownsCampPlot(progress,plot.id)&&(!plotId||plot.id===plotId);};
 const lamps=[...LIGHT_FIXTURES,...campRoadLights(progress,true).filter(l=>l.id.startsWith('camp-road-'))].filter(allowed);
 for(const l of lamps){const source=l.id.startsWith('camp-road-')?'camp-road:'+l.x+','+l.y:l.id;if(state.defaultLightIds.includes(source))continue;state.defaultLightIds.push(source);state.items.push({uid:state.nextId++,type:l.kind==='torch'?'default-torch':'default-lamp',x:l.x,y:l.y});}
 for(const s of signs){const b=CAMP_BUILDINGS.find(b=>b.id===s.building),q=b?campBuildingPosition(progress.campLayout,b):s,point={x:s.x+(b?q.x-b.x:0),y:s.y+(b?q.y-b.y:0)};if(!allowed(point))continue;const type='default-sign-'+s.id;if(state.items.some(i=>i.type===type))continue;state.items.push({uid:state.nextId++,type,...point});}
 state.defaultDecorVersion=1;return progress;
}

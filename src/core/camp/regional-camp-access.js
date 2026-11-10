// 现场权限共用真实距离；独立文件避免装备事务之间循环依赖。
import {WORKSHOP_INTERIORS} from '../../config/workshop-interiors.js';
import {REGIONAL_CAMPS,regionalNpc,regionalBuildings} from '../../config/regional-camps.js';
import {worldDistance} from '../../world/coordinates.js';
export function regionalCampAvailable(g){return g.mapId==='forest'&&(!g.cottage||!!WORKSHOP_INTERIORS[g.cottage.kind]?.regional)&&!g.realm&&!g.story&&!g.fireActive&&!g.fireTransit&&!g.campDefense&&!g.workshopTrial&&!g.arrivalCinematic&&!g.arrivalPending&&g.player.hp>0&&['playing','paused'].includes(g.state);}
export function regionalCampHere(g,id){return regionalCampAvailable(g)&&REGIONAL_CAMPS.find(c=>(!id||c.id===id)&&(!g.cottage||WORKSHOP_INTERIORS[g.cottage.kind]?.regional===c.id)&&[regionalNpc(c),...regionalBuildings(c).map(b=>({x:b.x,y:b.y+50}))].some(p=>worldDistance(g.cottage?.outside||g.player,p)<=130));}

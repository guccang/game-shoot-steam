// 规划绘制、占地校验与道路统一读取固定公共设施，避免不可见的禁放区。
import {WORLD_BUILDINGS} from '../config/world-buildings.js';
import {CAMP_BUILDINGS} from '../config/camp-layout.js';
import {LIVING_PLACES} from '../config/living-world.js';
const aliases={vehicle:'garage','cat-home':'catHome','warehouse-depot':'warehouseDepot'};
const names={fire:'森林消防站',legendary:'传奇工坊',relay:'旧哨站',kitchen:'阿团的厨房',market:'林间集市'};
// 尺寸来自正式实体矩形；固定设施使用独立选择ID，不混入可移动存档。
export function campFixedFacilities(progress){return [...WORLD_BUILDINGS.filter(f=>!CAMP_BUILDINGS.some(b=>b.id===(aliases[f.id]||f.id))&&(!f.conditional||progress.legendaryWorkshop?.unlocked)),...Object.entries(LIVING_PLACES).filter(([id,s])=>!['flowers','basket','warning','relay','kitchen','market'].includes(s.kind)&&!CAMP_BUILDINGS.some(b=>b.id===id)).map(([id,s])=>({...s,id,publicTable:true,rects:[[-s.width/2,-19,s.width/2,5]]}))].map(f=>({...f,sourceId:f.id,id:'fixed:'+f.id,name:f.name||names[f.id]||'公共设施',fixed:true,width:f.width||Math.max(...f.rects.map(r=>r[2]))-Math.min(...f.rects.map(r=>r[0])),height:f.height||Math.max(44,-Math.min(...f.rects.map(r=>r[1])))}));}

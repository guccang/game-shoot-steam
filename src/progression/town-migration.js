// 营地搬迁只平移旧营地内的持久位置，不重置任务、奖励、作物或野外进度。
import {TOWN_LAYOUT_VERSION,TOWN_SHIFT_X} from '../config/town-layout.js';
import {canonical} from '../world/coordinates.js';

// 旧营地与小院各自的实际边界；河岸、消防站和野外田地留在原处。
function oldTownPoint(p){
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;
 const {x,y}=canonical(p);
 return x>=120&&x<=1090&&y>=110&&y<=1400||x>=350&&x<=1040&&y>=1400&&y<=2040;
}
// 接送过场可在营地北侧，其他位置只迁移原院落中的点。
function move(point,always=false){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||!always&&!oldTownPoint(point))return;
 Object.assign(point,always?{x:point.x+TOWN_SHIFT_X,y:point.y}:canonical({x:point.x+TOWN_SHIFT_X,y:point.y}));
}
// 在白名单恢复前复制旧档并完成一次迁移，避免修改调用方数据或重复平移。
export function migrateTownProgress(raw){
 if((raw.townLayoutVersion||0)>=TOWN_LAYOUT_VERSION)return raw;
 const next=structuredClone(raw);
 next.townLayoutVersion=TOWN_LAYOUT_VERSION;
 if(next.mapId!=='jiuzhaigou')move(next.living?.position);
 for(const p of Object.values(next.living?.residents||{}))move(p);
 for(const p of next.farm?.plots||[])if(p.mapId!=='jiuzhaigou')move(p);
 move(next.restoration?.build);
 if(next.arrival)move(next.arrival,next.arrival.phase!=='complete');
 const story=next.story?.run;
 if(story?.forestReturn?.mapId!=='jiuzhaigou')move(story?.forestReturn);
 // 剧情营地检查点也跟随回营位置，野外战斗地点不平移。
 move(story?.checkpoint);
 return next;
}

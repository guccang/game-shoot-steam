import {bossCombatActive} from './boss-engagement.js';
import {clearingCombatActive} from '../camp/living-safety.js';
// 手机只提供联系与去向，不远程接单、交付、发奖或传送角色。
import {ownsKeepsake} from '../../progression/inventory/keepsakes.js';
import {livingResidents,residentSchedule,residentLine} from '../camp/living-world.js';
import {LIVING_PLACES,LIVING_ACTION_NAMES,LIVING_REQUESTS} from '../../config/living-world.js';
import {livingForest} from '../../world/living-spaces.js';
import {worldDistance} from '../../world/coordinates.js';
import {requestWorldNavigation} from '../navigation/world-navigation.js';
import {COTTAGE} from '../../config/cottage.js';
// 通讯录与现场居民共享身份；当前扮演的角色不会出现在自己的联系人里。
export function phoneContacts(game){return ownsKeepsake(game.progress,'patrol-phone')?livingResidents(game):[];}
// 特殊活动及其他地图不接通森林电话，避免把场景借用角色当作常驻邻居。
export function phoneUnavailable(game){
 if(!ownsKeepsake(game.progress,'patrol-phone'))return '拿到松伯留下的手机后，就能联系邻居。';
 if(!livingForest(game)||game.cottage||!['playing','paused'].includes(game.state))return '回到森林自由巡游后，再联系邻居。';
 return '';
}
// 电话内容读取当前作息和任务阶段，休息时留下语音留言，仍可查看去向。
export function callNeighbor(game,id){
 const reason=phoneUnavailable(game);if(reason)return {ok:false,message:reason};
 const resident=phoneContacts(game).find(r=>r.id===id);if(!resident)return {ok:false,message:'通讯录里没有这位邻居。'};
 const schedule=residentSchedule(game,resident),place=LIVING_PLACES[schedule.place],away=worldDistance(resident,schedule)>100;
 const task=LIVING_REQUESTS.find(q=>{const record=game.progress.living.requests[q.id];return !record.completed&&record.stage>=0&&(q.host===id||q.steps[record.stage]?.resident===id);});
 const step=task?.steps[game.progress.living.requests[task.id].stage];
 const message=task?`关于「${task.title}」，接下来请${step.text}。到了地方再当面办，我等你的消息。`:residentLine(game,{...resident,action:schedule.action});
 // 电话只问候与约见，不绕过当面交谈的熟悉程度。
 return {ok:true,id,name:resident.name,status:schedule.action==='rest'?'语音留言':'通话已接通',
  location:`${away?'正在前往':'在'}${place.name} · ${LIVING_ACTION_NAMES[schedule.action]||resident.job}`,
  message: (schedule.action==='rest'?`我歇一会儿，先给你留句话。${message}`:message),
  site:{id:resident.id,name:resident.name,x:resident.x,y:resident.y,mapId:'forest'}};
}
// 使用正式导航跟随居民最新位置；战斗中保留通话，但禁止覆盖战斗路线。
export function navigatePhone(game,id){
 const reason=phoneUnavailable(game);if(reason)return {ok:false,message:reason};
 if(bossCombatActive(game)||game.livingBattle||clearingCombatActive(game))return {ok:false,message:'先离开当前战斗范围，再去拜访或回家。'};
 const call=id==='home'?null:callNeighbor(game,id);if(call&&!call.ok)return call;
 const site=call?.site||{...COTTAGE.door,id:'cottage',name:'巡林小屋',mapId:'forest'};
 requestWorldNavigation(game,site,call?'去找'+call.name:'回巡林小屋',{direct:true});
 return {ok:true,message:call?'已标出'+call.name+'的位置，路线会跟随邻居移动。':'已标出回小屋的路。'};
}

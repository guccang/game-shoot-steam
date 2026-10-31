// 清缴引导只读取真实状态，不建立另一份任务进度或改变波次完成条件。
import {CLEARING_POST,CLEARING_APPROACH} from '../config/clearing.js';
import {clearingSite} from '../progression/clearing-site.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {facilityOpen,facilityReason} from '../config/town-restoration.js';
import {worldDistance} from '../world/coordinates.js';
import {setLivingPatrol} from './living-world.js';
import {clearingCombatActive} from './living-safety.js';

// 接取、赶路、普通波次与Boss共用同一阶段判断；回营后自然恢复赶路提示。
export function clearingStage(game){
 if(!game.progress?.living?.patrolActive)return 'accept';
 if(worldDistance(game.player,clearingSite(game.progress))>clearingSite(game.progress).radius)return 'travel';
 return game.boss?'boss-fight':game.bossReady?'boss':'waves';
}
// 界面禁用与正式接取共用具体原因；原生弹窗暂停不妨碍现场确认。
export function clearingPostReason(game){
 if(game.state==='dead')return '请先复活，再接取清缴任务。';
 if(game.mapId!=='forest')return '请先返回森林营地的清缴告示牌。';
 if(game.campDefense)return '请先结束营地防守，再接取清缴任务。';
 if(game.workshopTrial)return '请先退出武器试用，再接取清缴任务。';
 if(game.story)return '请先结束当前故事，再接取清缴任务。';
 if(game.realm)return '请先退出当前挑战，再接取清缴任务。';
 if(game.fireActive)return '请先结束消防任务，再接取清缴任务。';
 if(game.arrivalCinematic)return '请先完成入职引导，再接取清缴任务。';
 if(!livingForest(game))return '请先离开当前战场，返回营地清缴告示牌。';
 if(game.mainlineSpeech)return '请先结束当前对话，再操作清缴告示牌。';
 if(!['playing','paused'].includes(game.state))return '请先返回游戏，再操作清缴告示牌。';
 if(!facilityOpen(game.progress,'clearing'))return facilityReason(game.progress,'clearing');
 if(worldDistance(game.player,CLEARING_APPROACH)>CLEARING_POST.radius)return '请先靠近营地南侧的清缴告示牌，再操作。';
 // 已接取的继续按钮只恢复导航；新接取还须满足正式巡护事务的安全要求。
 if(!game.progress.living.patrolActive){
  if(game.livingPreview)return '请先退出预览，再接取清缴任务。';
  if(game.boss)return '请先结束当前领主战斗，再接取清缴任务。';
  if(game.livingBattle)return '请先结束当前遭遇战，再接取清缴任务。';
  if(!livingSafePoint(game.player))return '请回到木栏保护的营地内，再接取清缴任务。';
 }
 return '';
}
// 是否可用由同一原因函数推导，避免按钮与实际接取各自解释条件。
export function canUseClearingPost(game){return !clearingPostReason(game);}
// 在同一存档事务中接取并聚焦巡护，已接取时再次点击不会取消任务。
export function acceptClearingPost(game){
 const reason=clearingPostReason(game);if(reason)return {ok:false,message:reason};
 return game.progress.living.patrolActive?{ok:true}:setLivingPatrol(game,true);
}
// 教学目标永远指向当前可执行操作；战斗期间不再显示去NPC或告示牌的路线。
export function clearingObjective(game){
 const stage=clearingStage(game),accept=stage==='accept';
 // 赶路阶段与刷怪边界保持原样，寻路显隐跟随更大的战斗 UI 范围。
 return {key:accept?'clearing-post':'boss-clearing',site:accept?CLEARING_APPROACH:clearingSite(game.progress),navigation:['accept','travel'].includes(stage)&&!clearingCombatActive(game),clearingStage:stage,
  label:accept?'去清缴告示牌接取':stage==='travel'?'前往本次清缴地点':stage==='boss'?'领主即将登场':stage==='boss-fight'?'击败森林领主':'清理当前怪潮',
  hint:accept?'靠近告示牌 → 点击接取':stage==='travel'?'沿光点出发 · 到场开始':stage==='boss'?'最后一战，自动开启':'击败怪物，节点自动推进'};
}

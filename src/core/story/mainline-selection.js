import {stopWaystationTravel} from '../navigation/navigation-control.js';
// 巡林簿的主动选择共用候选存档事务；失败保留原任务、进度与追踪状态。
import {MAINLINE_TASKS,currentMainlineTask} from '../../config/mainline.js';
import {isCampaignTask} from '../../config/mainline-pacing.js';
import {validateProgress} from '../../progression/progress.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {clearWorldNavigation} from '../navigation/world-navigation.js';
// 章节顺序固定，自选体验可来回切换；正在战斗或演出时不能换任务。
export function selectMainlineTask(game,id=null){
 if(!['playing','paused'].includes(game.state)||game.story||game.realm||game.fireActive||game.campDefense||game.boss||game.livingBattle||game.workshopTrial||game.progress.living.patrolActive)return false;
 const run=game.progress.mainline,task=MAINLINE_TASKS.find(t=>t.id===id),nextStory=MAINLINE_TASKS.find(t=>isCampaignTask(t)&&!run.completed.includes(t.id));
 if(id&&(!task||run.completed.includes(id)||isCampaignTask(task)&&task!==nextStory))return false;
 const next=validateProgress(bindEconomy(structuredClone(game.progress),economyFor(game.progress))),r=next.mainline,current=currentMainlineTask(r);
 if(id&&current?.id!==id){
  if(current)r.suspended[current.id]={phase:r.phase,gardening:structuredClone(r.gardening)};
  r.currentId=id;r.phase=r.suspended[id]?.phase||'meet';
  r.gardening=structuredClone(r.suspended[id]?.gardening||{taskId:null});
 }
 r.trackingPaused=!id;next.taskTracking={kind:id?'mainline':'none'};
 if(id)r.navigationEnabled=true;
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=(game.mainlinePersist?.(next)??true)===true;}catch{}
 if(!saved){game.mainlineError='选择未保存，请重试。';return false;}
 game.progress=next;if(id&&game.waystationTravel)stopWaystationTravel(game,'');game.mainlineError='';game.mainlineSpeech=null;clearWorldNavigation(game);game.onEvent('mainline-change');return true;
}

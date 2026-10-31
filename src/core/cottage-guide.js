// 小屋首次休息教学复用任务卡和真实门口，睡眠成功前不推进后续主线。
import {facilityOpen} from '../config/town-restoration.js';
import {arrivalPending} from '../config/ranger-arrival.js';
import {COTTAGE} from '../config/cottage.js';
import {livingForest} from '../world/living-spaces.js';
// 建成记录与首次睡醒记录一起持久化，老存档已建小屋也能补做一次。
export function cottageRestGuideActive(game){
 return facilityOpen(game.progress,'cottage')&&!game.progress.restoration.cottageRested&&livingForest(game)&&!arrivalPending(game.progress)&&!game.boss&&!game.livingBattle&&!game.progress.living?.patrolActive;
}
// 室内改用床边提示，不把世界门口坐标投影到室内地图。
export function cottageRestObjective(game,task){
 if(!cottageRestGuideActive(game)||game.cottage)return null;
 return {task:{...task,id:'cottage-first-rest',title:'进屋休息，恢复生命'},cottageRest:true,key:'cottage-first-rest',phase:'doing',navigation:true,
  site:{...COTTAGE.door,mapId:'forest',name:'巡林小屋门前'},label:game.vehicle.active?'先下车，再点击「进入小屋」':'靠近小屋，点击「进入小屋」',
  hint:'靠近后点击「进入小屋」，也可在门前站定3秒进入；到床边点击休息，恢复全部生命。'};
}

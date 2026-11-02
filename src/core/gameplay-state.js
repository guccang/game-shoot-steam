// 玩法诊断快照只读真实状态，不推进任务、寻路、随机数或存档迁移。
import {currentMainlineTask} from '../config/mainline.js';
import {storyRouteDiagnostics} from './story-route.js';
import {worldNavigationDiagnostics} from './world-navigation.js';

// 明确选取字段，避免整棵场景树、敌人数组和历史存档进入日志。
function pick(object,keys){if(!object)return null;return Object.fromEntries(keys.map(key=>[key,object[key]??null]));}
// 按玩法分组，状态变化可以直接与前后操作和游戏事件对照。
export function gameplayState(game){
 if(!game)return {scene:{ready:false}};
 const p=game.progress||{},run=p.mainline,site=p.living?.clearingSite;
 return {
  scene:{state:game.state,mapId:game.mapId,arrival:p.arrival?.phase,preview:!!game.livingPreview,trial:!!game.workshopTrial},
  player:pick(game.player,['x','y','hp','maxHp','flying','treePass']),
  equipment:{hero:p.hero,weapon:p.weapon,weapons:p.weapons,heroes:p.heroes,vehicleHulls:p.vehicleHulls,vehicleWeapons:p.vehicleWeapons,weaponParts:p.weaponParts,turretParts:p.turretParts,vehicleParts:p.vehicleParts,vehicleLoadouts:p.vehicleLoadouts,funnel:p.funnelLoadout,mechanical:p.mechanicalLoadout,spider:p.spiderLoadout,vehicle:pick(game.vehicle,['active','index','hp','maxHp','cooldown']),parking:p.campParking},
  mainline:{id:currentMainlineTask(run)?.id,phase:run?.phase,completed:run?.completed,seen:run?.seen,combatPractice:run?.combatPractice,error:game.mainlineError,speech:pick(game.mainlineSpeech,['id','phase','paused']),tracking:p.taskTracking},
  clearing:{active:!!p.living?.patrolActive,site:pick(site,['id','mapId','x','y','radius']),wave:game.wave,kills:game.waveKills,spawned:game.waveSpawned,bossWave:game.bossWave,bossReady:game.bossReady,bosses:p.bosses,pendingRound:game.pendingClearingRound,boss:pick(game.boss,['id','kind','hp','maxHp','livingChallenge']),enemies:game.enemies?.length},
  navigation:{...worldNavigationDiagnostics(game),route:storyRouteDiagnostics(game)},
  story:{active:pick(game.story,['chapterId','stageId','phase','loadoutId','routeId','error','combat','choices','flags']),chapters:p.story?.chapters},
  realm:pick(game.realm,['mode','stage','phase','cleared','encounter','score','remaining','goddessHp','realmCoins','reason','buffs','blessingCounts','defenses','distance','nextGate','place','stamina','sprinting']),
  defense:pick(game.campDefense,['gateId','phase','wave','cleared','kills','waveKills','gateHp','bossHp','bossDefeated','reason','error']),
  fire:{active:!!game.fireActive,...pick(game.fireRescue,['phase','remaining','water','kills','refills','reason'])},
  farm:{work:pick(game.farmWork,['tool','job','autoCombat']),...pick(p.farm,['xp','harvested','watered','planted','dug','seeds','inventory']),plots:p.farm?.plots?.slice(0,32).map(plot=>pick(plot,['id','mapId','crop','watered','readyAt'])),plotCount:p.farm?.plots?.length},
  living:{battle:game.livingBattle,requests:p.living?.requests,calendar:pick(p.living?.calendar,['day','elapsed']),cottage:pick(game.cottage,['kind','sleep','restElapsed','displayEntry'])},
  restoration:pick(p.restoration,['repaired','cottageRested','build','gathered']),
  resources:{...pick(p,['coins','wood']),materials:p.materials,campLevel:p.campLevel},
 };
}

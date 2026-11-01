import {vehicleMaxHp} from '../config/vehicles.js';
import {configureVehicle} from '../combat/vehicle.js';
import {syncCampDefense} from '../core/camp-defense.js';
import { i18nText } from "../i18n/index.js";
// 存档应用控制器统一处理成长、巡游检查点、清档和体验解锁事务。
import { freshRangerProgress } from '../progression/progress.js';
import { unlockedWeaponProgress } from '../progression/unlock-weapons.js';
import { capturePatrol } from '../core/patrol-session.js';
import { debugGrantProgress } from '../progression/debug-grants.js';

// 存储和界面均由宿主注入，测试可使用内存存储而不依赖真实浏览器。
export function createProgressController({
  game,
  store,
  root,
  input,
  dialogs,
  inventory,
  refresh,
  toast,
  profiler,
  canSave = () => true,
}) {
  let elapsed = 0;
  // 集中反馈存储可用性，禁止失败时宣称已经清档。
  function renderSaveStatus() {
    root.getElementById('save-label').textContent = store.available
      ? i18nText("app.progress-controller.5b87394b6c")
      : i18nText("app.progress-controller.9afd2c564d");
  }
  // 同一个 JSON 提交成长与已结算的巡游进度，避免两个存档键不同步。
  function save() {
    if (!canSave()) return false;
    game.syncStory();game.syncFireRescue();syncCampDefense(game);
    profiler?.start('storage');
    game.progress.patrol = capturePatrol(game);
    const result = store.saveProgress(game.progress);
    elapsed = 0;
    renderSaveStatus();
    profiler?.end('storage');
    return result;
  }
  // 战斗中每两秒补写血量和计时，关键事件及离开页面另行即时保存。
  function checkpoint(dt) {
    if (game.state !== 'playing' && !(game.state === 'realm' && game.realm?.phase === 'rest')) return;
    elapsed += dt;
    if (elapsed >= 2) save();
  }
  // 清档必须先写成功，再重建内存与界面；失败保持原游戏完全不变。
  function resetProgress() {
    if (!store.saveProgress(freshRangerProgress())) {
      renderSaveStatus();
      return false;
    }
    input.reset();
    dialogs.cancelResume();
    game.resetProgress();
    inventory.reset();
    elapsed = 0;
    renderSaveStatus();
    refresh();
    toast.show(i18nText("app.progress-controller.35a1a7193d"));
    return true;
  }
  // 解锁与当前巡游一起保存，保留所有战场对象和冷却，不覆盖最新波次。
  function unlockWeapons() {
    if(game.story)return false;
    const next = unlockedWeaponProgress(game.progress);
    next.patrol = capturePatrol(game);
    if (!store.saveProgress(next)) {
      renderSaveStatus();
      return false;
    }
    game.progress = next;
    renderSaveStatus();
    refresh();
    return true;
  }
  // 调试与解锁一样先保存再提交，写入失败不发放部分资源或覆盖最新巡游。
  function debugGrant(kind) {
    if(game.story)return false;
    const next=debugGrantProgress(game.progress,kind);
    // 采集巡游位置也写入候选进度，保存失败时原存档对象完全不变。
    next.patrol=capturePatrol(Object.assign(Object.create(game),{progress:next}));
    if(!store.saveProgress(next)){renderSaveStatus();return false;}
    game.progress=next;
    // 建筑外观与入口立即读取新存档，同时停止旧施工和入职演出残留。
    if(kind==='buildings'){game.arrivalScene=null;game.arrivalError=false;game.restorationError='';game.restorationRetry=0;}
    // 一级解锁和满级奖励均即时同步车体与主炮，保留耐久、冷却和弹夹；临时玩法装备独立。
    if((kind==='vehicles'||kind==='max-vehicles')&&!game.realm&&!game.fireActive)for(const vehicle of game.vehicles){
      const ratio=vehicle.maxHp>0?vehicle.hp/vehicle.maxHp:0;
      vehicle.maxHp=vehicleMaxHp({...next,vehicleIndex:vehicle.index},game.maxHp());
      vehicle.hp=vehicle.maxHp*ratio;
      const weapon=next.vehicleLoadouts[vehicle.index];if(weapon!==null)configureVehicle(game,weapon,vehicle.index);
    }
    renderSaveStatus();refresh();return true;
  }
  return { save, checkpoint, resetProgress, unlockWeapons, debugGrant, renderSaveStatus };
}

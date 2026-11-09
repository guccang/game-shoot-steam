
import {createWeaponTrialScene} from './weapon-trial-scene.js';
import { bindEconomy, economyFor } from '../../config/economy.js';
// 隔离靶场使用正式 Game 战斗更新与专属随机流，不连接存档、奖励或世界时钟。
import { Game } from '../game.js';
import { validateProgress } from '../../progression/progress.js';

// 两次试射由相同种子与布局启动，持续运行至界面主动结束，避免比较时受到随机散布差异干扰。
export function createWorkshopTrial(progress, kind, index, reduced = false, options = {}) {
  if(options.scene)return createWeaponTrialScene(progress,kind,index,reduced);
  const p = validateProgress(bindEconomy(JSON.parse(JSON.stringify(progress)),economyFor(progress)));
  p.patrol = null; p.realms.run = null; p.mapId = 'forest';
  if (kind === 'weapons') p.weapon = index;
  else p.vehicleIndex = index;
  let seed = 71;
  // 靶场随机序列只存在于此会话中。
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const game = new Game(p, random);
  // 隔离靶场不是常驻森林，不接受安宁区停火或主线NPC打断。
  game.workshopTrial=true;
  game.trees = []; game.enemies = []; game.boss = null; game.hazards = [];
  game.state = 'playing'; game.reducedMotion = reduced;
  game.setViewport(600, 300);
  // 靶场固定取景与正式试射绘制一致，不能使用游戏手机镜头裁掉后排靶。
  const rider = kind === 'vehicle' && p.vehicleLoadouts[index]===null;
  const controller=kind==='weapons'||rider?game.weapon().controller:null;
  const flying=['funnel','drone'].includes(controller),scale=flying?.78:1;
  const offset=flying?180:['mechanical','spider'].includes(controller)?140:80;
  game.summonView={left:-offset/scale,right:(560-offset)/scale,top:-150/scale,bottom:120/scale,width:600,height:300};
  // 不生成波次或接收伤害；攻击、装填、弹道和独立模块全部保留正式规则。
  game.updateWaves = () => {};
  game.hurt = () => {};
  const origin = { x: 900, y: 750 };
  Object.assign(game.player, origin);
  const melee = (kind === 'weapons' || rider ? game.weapon() : null)?.attackKind === 'melee' ||
    (kind === 'vehicle' && p.vehicleLoadouts[index] === 14);
  const slots = options.count ? [[melee?42:120,0],[melee?45:135,-14],[melee?48:150,14],[melee?51:165,-20],[melee?54:180,20]] : [[melee ? 66 : 175, 0], [245, -32], [280, 28], [330, -22], [365, 18]];
  const targets = new Map();
  let batch = 0, completed = 0;
  // 每批仅替换靶标和固定靶位记录，保留正在飞行的弹丸、弹药、装填和攻击冷却。
  function refillTargets() {
    targets.clear(); batch++;
    for (const [x, y] of slots.slice(0,options.count||5)) {
      const target = game.spawnEnemy(0, 100, { x: origin.x + x, y: origin.y + y });
      target.hp = target.maxHp = options.hp || 54; target.speed = 0; target.damage = 0;
      target.workshopTarget = true;
      targets.set(target.id, { x: target.x, y: target.y });
    }
  }
  refillTargets();
  if (kind === 'vehicle') {
    game.vehicle.active = true;
    // 无炮塔载具展示骑手武器；其他载具只演示独立炮塔。
    if (!rider) {
      game.attack = () => {};
      game.updateWeaponAbility = () => {};
      game.progress.weapon = 0;
    }
  }
  let elapsed = 0;
  // 按固定编号保持靶位，击毁后剩余靶标不因数组下标改变而移位，也不恢复血量。
  function pinTargets() {
    for (const target of game.enemies) {
      // 引力枪试射保留靶标实际位移，才能观察聚怪而不是每帧复位。
      if(game.weapon().id!=='gravity-gun')Object.assign(target, targets.get(target.id)); target.vx = target.vy = 0;
    }
  }
  // 使用固定小步推进，后台停留不补算；有限耐久沿用正式伤害、击毁和重新索敌。
  function advance(dt) {
    const step = Math.min(1 / 30, Math.max(0, dt));
    if (step <= 0) return true;
    pinTargets();
    Object.assign(game.player, origin);
    game.update(step); elapsed += step;
    // 正式死亡回收完成后整批补靶，同一帧恢复场地；跨越十秒也不重置会话状态。
    if (!game.enemies.length) {
      completed += targets.size;
      refillTargets();
    }
    pinTargets();
    return true;
  }
  return { game, advance, get elapsed() { return elapsed; }, total: options.count || slots.length,
    get batch() { return batch; },
    get destroyed() { return completed + targets.size - game.enemies.filter(e => e.hp > 0).length; } };
}

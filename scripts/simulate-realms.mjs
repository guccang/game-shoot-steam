// 使用真实移动、弹道、装填、扑击与碰撞模拟秘境，不直接扣敌人生命或改写通关状态。
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { REALM_ARENA } from '../src/config/realms.js';

// 固定种子让每次平衡检查面对相同的随机遭遇与祝福。
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
// 简单机器人沿中心环绕，守护时围绕祭坛走位，不具备玩家的策略判断。
function simulate(mode, level, heroLevel = 1) {
  const progress = freshProgress();
  progress.weapons[0] = level;
  progress.heroes[0] = heroLevel;
  const game = new Game(progress, seeded(20261021));
  game.enterRealm(mode);
  let elapsed = 0;
  for (let step = 0; step < 24000; step++) {
    const r = game.realm;
    if (['won', 'lost'].includes(r.phase)) break;
    // 守护机器人使用新手已有装备布防，波间优先升级前排支架。
    if (r.phase === 'build') {
      game.guardianDefense('deploy', 0, 'weapon', 0);
      game.guardianDefense('deploy', 2, 'vehicle', 0, 0);
      game.continueRealm();
    }
    // 远征机器人同样完成三槽领取，禁止绕过真实补给阶段。
    if (r.phase === 'loadout') {
      game.rollRealmEquipment('weapon'); game.rollRealmEquipment('vehicle'); game.rollRealmEquipment('turret'); game.readyRealm();
    }
    if (r.phase === 'choice') {
      if (mode === 'guardian') for (const tower of r.defenses) game.guardianDefense('upgrade', tower.slot);
      const priority = r.mode === 'guardian' && r.goddess.hp < 500 ? ['mend', 'heal', 'power'] :
        game.player.hp < game.maxHp() * .45 ? ['heal', 'vitality', 'leech', 'power', 'haste'] :
        ['power', 'haste', 'leech', 'vitality', 'reach', 'armor', 'mend', 'heal'];
      game.chooseRealmBlessing(priority.find(key => r.offers.includes(key)) || r.offers[0]);
    }
    if (r.phase === 'rest') game.continueRealm();
    if (r.mode === 'rogue' && !game.vehicle.active && game.vehicle.cooldown === 0) game.summonVehicle();
    const radius = mode === 'guardian' ? 50 : 100;
    const x = REALM_ARENA.x + Math.cos(elapsed * .85) * radius - game.player.x;
    const y = REALM_ARENA.y + Math.sin(elapsed * .85) * radius - game.player.y;
    const length = Math.max(1, Math.hypot(x, y));
    game.update(.05, { x:x/length, y:y/length });
    elapsed += .05;
  }
  return { mode, weapon:game.weapon().id, weaponLevel:game.loadout.weapons[game.loadout.weapon], heroLevel, phase:game.realm.phase, cleared:game.realm.cleared,
    seconds:Math.round(elapsed), hp:Math.ceil(game.player.hp), goddessHp:Math.ceil(game.realm.goddess.hp) };
}
for (const [mode, level, heroLevel] of [['rogue', 1, 1], ['tower', 5, 1], ['tower', 10, 5], ['guardian', 1, 1]])
  console.log(JSON.stringify(simulate(mode, level, heroLevel)));

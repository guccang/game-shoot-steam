import {vehicleMotorSound} from '../config/vehicle-eras.js';
import { challengeVictoryText } from '../ui/challenge-feedback.js';
import { i18nText } from "../i18n/index.js";
// 游戏事件到声音、提示和保存的应用适配，不反向改变战斗规则。
// 依赖显式注入，其他界面可替换这一层而复用 Game。
import { reloadSound } from '../platform/audio-sounds.js';
import {MUTED_WEAPON_SOUNDS} from '../platform/audio-weapons.js';
export function createGameEventHandler({ root, audio, toast, input, save }) {
  const $ = (id) => root.getElementById(id);
  // 购买、奖励和死亡写入成长，射击仅播放音效。
  function handleEvent(type, data) {
    // 电锯无可用音色时，切割、命中和充能都静默；不影响实际攻击、采集与存档事件。
    if(type==='chainsaw-contact'||MUTED_WEAPON_SOUNDS.has(data?.kind)&&['shot','weapon-sound','weapon-hit','reload-start','reload-complete'].includes(type))return;
    if(type==='camp-defense-change'||type==='camp-defense-complete'||type==='camp-defense-exit'){input.reset();save();if(type==='camp-defense-complete')audio.play('victory');return;}
    if(type==='restoration-start'){audio.play('purchase');return;}
    if(type==='restoration-complete'){audio.play('purchase');toast.show(data.name+'修复完成'+(data.taskTitle?'，已接取：'+data.taskTitle:'，功能已开放'));return;}
    if(type==='arrival-change'){input.reset();save();return;}
    if(type==='arrival-hint'){toast.show(i18nText('arrival.locked'));return;}
    if(type==='arrival-complete'){save();audio.play('purchase');toast.show(i18nText('arrival.complete'));return;}
    if(type==='fire-change'){save();if(data?.sound)audio.play(data.sound);if(data?.text)toast.show(data.text);return;}
    if(type==='story-change'){input.reset();save();return;}
    if(type==='living-change'){input.reset();return;}
    // 自动清缴提示只保存展示记录，不能清空玩家正在按住的移动输入。
    if(type==='clearing-notice-shown'){save();return;}
    if(type==='living-kill'){save();return;}
    if(type==='hero-experience'){save();return;}
    if(type==='vehicle-durability'){save();return;}
    if(type==='vehicle-fault'){if(data?.text)toast.show(data.text);return;}
    if(type==='vehicle-service'){save();if(data?.text)toast.show(data.text);return;}
    if(type==='story-hint'){toast.show(data.text);return;}
    if(type==='story-complete'){audio.play('victory');toast.show(i18nText("app.game-events.d6bdf7c915"));return;}
    // 单次进球不保存未结算比赛，也不清空正在按住的方向键。
    if(type==='football-goal'){audio.play('purchase');return;}
    if (type === 'map-change') { input.reset(); save(); toast.show(i18nText("app.game-events.2320e3969d", { p0: (data.name) })); return; }
    if (type.startsWith('realm-')) {
      if (!['realm-boss', 'realm-boss-defeated'].includes(type)) input.reset();
      save();
      if (type === 'realm-boss') toast.show(i18nText("app.game-events.cf486e2ffa", { p0: (data.name) }));
      if (type === 'realm-clear') { audio.play('victory'); toast.show(data?.mode === 'tower' ? i18nText("app.game-events.3a65c84292") : data?.mode === 'guardian' ? i18nText("app.game-events.aa94d4fd52") : i18nText("app.game-events.621156f211")); }
      if (type === 'realm-finish') { audio.play(data.won ? 'victory' : 'meow-down'); toast.show(data.mode === 'football' ? `比赛结束 · 进球 ${data.score} · 已返回主场景` : data.won ? i18nText("app.game-events.de2568365e") : i18nText("app.game-events.949c859f9a")); }
      return;
    }
    if (type === 'reload-start' || type === 'reload-complete') {
      audio.play(reloadSound(data.kind, type === 'reload-complete'),data?.source);
      return;
    }
    if (type === 'shot') {
      // 潮汐炮每根喷口在真正发射时发声，不提前排队播放第二声。
      if(data.kind!=='hover-tide')audio.play(data.kind || (data.laser ? 'laser' : 'pistol'),data.source);
      return;
    }
    if(type==='weapon-sound'){audio.play(data.kind,data.source);return;}
    if(type==='weapon-hit'){audio.play('weapon-hit');return;}
    if (type === 'purchase') {
      const message = `${data.name}${data.action === 'buy' ? i18nText("app.game-events.c9c1d5a625") : data.action === 'upgrade' ? i18nText("app.game-events.16a80d897a") : data.action === 'modify' ? i18nText("app.game-events.b45fc25596") : i18nText("app.game-events.a68821c619")}`;
      toast.show(message);
      $('camp-feedback').textContent = message;
      audio.play('purchase');
      save();
    }
    if (type === 'funnel-config') save();
    if (type === 'vehicle-config') save();
    // 上下车及损毁即时落盘，手机随即关闭页面也保留最后的乘坐状态。
    if (['vehicle-summon', 'vehicle-dismount', 'vehicle-destroyed'].includes(type)) save();
    if (type === 'equipment-goal') save();
    if (type === 'vehicle-summon') {
      toast.show(i18nText("app.game-events.9fd3483305", { p0: (data?.name || i18nText("app.game-events.8f9f50d425")) }));

    }
    if(type==='vehicle-summon'||type==='vehicle-dismount'){
      const sound=vehicleMotorSound(data?.index), action=type==='vehicle-summon'?'start':'stop';
      if(sound!==-1)audio.play(Number.isInteger(sound)?'vehicle-'+action+'-'+sound:'vehicle-'+action);
    }
    if (type === 'vehicle-destroyed') {
      toast.show(data?.permanent?`${data.name}已报废，请用手机呼叫救援或前往维修中心。`:i18nText("app.game-events.d290571244", { p0: (data?.name || i18nText("app.game-events.8f9f50d425")) }));
      audio.play('explosion');
    }
    // 伐木后续账本也写累计增量，避免刚入库又同步重写一遍全档。
    if (type === 'reward') save({woodTransaction:!!data?.woodTransaction});
    if (['wave-clear', 'wave-start', 'boss-ready'].includes(type)) save();
    if (type === 'boss-ready') toast.show(i18nText("app.game-events.4df4f06ff3", { p0: (data.wave) }));
    if (type === 'start') {
      const saved=save();
      audio.play('meow-start');
      // 回城后明确展示本次损失，并立即保存活动快照，重复开始或刷新不再扣款。
      if(data?.deathPenalty)toast.show(`已回到营地。死亡惩罚：损失 ${data.deathPenalty.coinsLost} 金币（10%），剩余 ${data.deathPenalty.coinsRemaining} 金币。${saved===false?'存档失败，请重试保存。':''}`,6000);
    }
    if (type === 'wave-clear') toast.show(i18nText("app.game-events.62d4daec2e", { p0: (data.wave) }));
    if (type === 'wave-start') toast.show(i18nText("app.game-events.235093e323", { p0: (data.wave) }));
    if (type === 'boss') {
      save();
      toast.show(i18nText("app.game-events.a9a6e3a800", { p0: (data?.name || i18nText("app.game-events.3710639685")), p1: (data?.hint || i18nText("app.game-events.2a5f3899d2")) }));
    }
    if (type === 'boss-support') toast.show(i18nText("app.game-events.b0b3db9069", { p0: (data.seconds), p1: (data.count) }));
    if (type === 'victory') {
      if(!data?.clearingComplete||!data?.qualification)toast.show(data?.qualification?challengeVictoryText(data):data?.clearingComplete?'清缴完成':i18nText("app.game-events.94afe543ef"));
      audio.play('victory');
      audio.play('meow-happy');
      save();
    }
    if (type === 'hurt' && !data?.fatal) audio.play(data?.armored ? 'armor-hit' : 'meow-hurt');
    if (type === 'grenade-launch') audio.play('grenade',data?.source);
    if (type === 'explosion') audio.play('explosion',data?.source);
    if (type === 'death') {
      audio.play('meow-down');
      input.reset();
      save();
    }
  }
  return handleEvent;
}

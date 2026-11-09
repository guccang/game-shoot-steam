import { i18nText } from "../../i18n/index.js";
// 配置提交先保存候选进度；失败保留原槽位及所有战斗状态。
import { canMountMechanical } from '../../config/mechanical-loadout.js';
import { capturePatrol } from '../battle/patrol-session.js';
// 整队配置同时供手持与车载核心读取；不补血、不补弹、不重建节点。
export function configureMechanical(game,index,persist) {
  if(game.realm||game.story)return {ok:false,reason:i18nText("core.mechanical-loadout.8069708b1d")};
  if(!game.progress.weapons[15]&&!game.progress.vehicleWeapons[15])return {ok:false,reason:i18nText("core.mechanical-loadout.458630945a")};
  if(!canMountMechanical(game.progress,index))return {ok:false,reason:i18nText("core.mechanical-loadout.b14156f857")};
  const next={...game.progress,mechanicalLoadout:index,patrol:capturePatrol(game)};
  try {if(persist(next)!==true)return {ok:false,reason:i18nText("core.mechanical-loadout.bc3f451b7c")};} catch {return {ok:false,reason:i18nText("core.mechanical-loadout.bc3f451b7c")};}
  game.progress.mechanicalLoadout=index;
  return {ok:true};
}

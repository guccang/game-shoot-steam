import { i18nText } from "../../i18n/index.js";
// 蜘蛛单枪架配置先保存后生效，不重建母体、小蛛或任一枪械的运行状态。
import { canMountSpider } from '../../config/spider-loadout.js';
import { capturePatrol } from '../battle/patrol-session.js';

// 永久配置只在森林生效，保存失败保持原配置与供给。
export function configureSpider(game,index,persist){
  if(game.realm||game.story)return {ok:false,reason:i18nText("core.mechanical-loadout.8069708b1d")};
  if(!game.progress.weapons[16]&&!game.progress.vehicleWeapons[16])return {ok:false,reason:i18nText("core.spider-loadout.d4e544c529")};
  if(!canMountSpider(game.progress,index))return {ok:false,reason:i18nText("core.mechanical-loadout.b14156f857")};
  const next={...game.progress,spiderLoadout:index,patrol:capturePatrol(game)};
  try{if(persist(next)!==true)return {ok:false,reason:i18nText("core.mechanical-loadout.bc3f451b7c")};}catch{return {ok:false,reason:i18nText("core.mechanical-loadout.bc3f451b7c")};}
  game.progress.spiderLoadout=index;return {ok:true};
}

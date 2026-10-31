import {equipmentLevelCap} from '../config/legendary-workshop.js';
import {facilityOpen} from '../config/town-restoration.js';
import {campPurchasePrice} from './camp-level.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import {arrivalPistolPurchase} from '../config/ranger-arrival.js';
import { recordEconomy } from './economy-ledger.js';
// 购买、装备与升级事务：只修改进度数据，界面和战斗副作用由调用方处理。
import { HEROES } from '../config/heroes.js';
import { WEAPONS, isWeaponUnlocked } from '../config/weapons.js';
import { upgradeCost } from './progress.js';
import { payEquipment } from './equipment-goals.js';
// 所有条件先校验再扣费，失败保持原进度不变；已有旧枪不重复检查购买门槛。
export function transactProgress(progress, kind, index, action, context={}) {
  // 角色等级只由经验成长；获取仅允许猫窝事务，切换已有猫仍兼容原接口。
  if(kind==='heroes'&&(action==='upgrade'||action==='buy'&&!context.catHome))return false;
  if(kind!=='heroes'&&action!=='equip'&&!facilityOpen(progress,'weapons'))return false;
  if (
    !['heroes', 'weapons'].includes(kind) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= (kind === 'heroes' ? HEROES : WEAPONS).length
  )
    return false;
  const list = kind === 'heroes' ? HEROES : WEAPONS,
    level = progress[kind][index];
  const selected = kind === 'heroes' ? 'hero' : 'weapon';
  let cost = { coins: 0, wood: 0 };
  if (action === 'buy' && !level) {
    // 规则层校验领主战绩，避免只禁用按钮导致其他入口绕过购买门槛。
    if (kind === 'weapons' && !isWeaponUnlocked(progress, index)) return false;
    if (kind === 'weapons') {
      const firstPistol=arrivalPistolPurchase(progress,kind,index,action);
      if (!payEquipment(progress, kind, index)) return false;
      // 首枪与入职完成在同一候选存档提交，保存失败不能吞料或跳过购枪。
      if(firstPistol){progress.arrival.phase='complete';progress.arrival.elapsed=0;}
      progress.weapons[index] = 1;
      progress.weapon = index;
      return true;
    }
    cost = campPurchasePrice(progress,list[index]);
  } else if (action === 'upgrade' && level && level < equipmentLevelCap(progress,kind)) cost = upgradeCost(level,progress,kind,index);
  else if (action !== 'equip' || !level) return false;
  if (progress.coins < cost.coins || progress.wood < cost.wood) return false;
  if(action!=='equip')recordEconomy(progress,'expense',action+':'+kind+':'+index,cost);
  progress.coins -= cost.coins;
  progress.wood -= cost.wood;
  if (action === 'buy') {
    progress[kind][index] = 1;
    progress[selected] = index;
  }
  if (action === 'upgrade') progress[kind][index]++;
  if (action === 'equip') progress[selected] = index;
  return true;
}

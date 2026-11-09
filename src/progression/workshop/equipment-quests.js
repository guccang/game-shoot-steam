// 交易、工坊与装备目标共用购买资格，赠礼和已拥有装备的升级独立处理。
import {EQUIPMENT_QUESTS,equipmentStoryCompleted} from '../../config/equipment-quests.js';
import {WEAPONS} from '../../config/weapons.js';
import {COLLECTED_VEHICLES} from '../../config/vehicles.js';

// 独立车炮不按手持武器编号匹配任务。
export function equipmentQuest(kind,index){
  const item=(kind==='weapons'?WEAPONS:kind==='vehicle'?COLLECTED_VEHICLES:[])[index];
  return item?EQUIPMENT_QUESTS.find(q=>q.kind===kind&&q.equipment===item.id)||null:null;
}

// 已有装备豁免首次购买门槛；老存档已完成的第四、第五章直接承认。
export function equipmentQuestReason(progress,kind,index){
  const q=equipmentQuest(kind,index),owned=(kind==='vehicle'?progress.vehicleHulls:progress.weapons)?.[index];
  return q&&!owned&&!equipmentStoryCompleted(progress,q.chapter)?`需完成邻里故事《${q.title}》后购买`:'';
}

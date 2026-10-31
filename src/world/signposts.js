// 区域站牌选在主路旁的林间空地，只作为装饰，不增加移动或弹道障碍。
import {forestThreatAt} from './forest-levels.js';
import { BIOMES } from './biomes.js';

// 营地牌移到田地东北侧的原工坊空地，避开回信驿门牌与桥路；名称和等级仍从区域配置读取。
const POSITIONS = {
  meadow: [1020, 500],
  pine: [676, 2160],
  amber: [2320, 820],
  deep: [2604, 2220],
};
export const REGION_SIGNPOSTS = BIOMES.map((zone) => ({
  type: 'signpost',
  x: POSITIONS[zone.id][0],
  y: POSITIONS[zone.id][1],
  zone:{...zone,range:forestThreatAt(...POSITIONS[zone.id]).range},
}));

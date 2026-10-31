// 团子质量只由类型决定，阶级继续影响生命、伤害与奖励，不再改变抗击退质量。
import {GAMEPLAY_TABLES} from './gameplay-tables.js';
import content from './content/monsters.json' with {type:'json'};

// 保留旧质量表以兼容数值工具；普通团子统一取首项，铁甲与车载读取绝对质量。
export function enemyMass(species){
 if(species==='ironwood-bulwark')return content.armored.mass;
 if(species==='bramble-buggy')return content.ranged[species].mass;
 return GAMEPLAY_TABLES.enemyMassByRank[0];
}

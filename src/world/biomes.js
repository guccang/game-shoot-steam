import {enemyLevelHealth} from '../config/combat-levels.js';
import {monsterCampClearing,monsterCampTerritoryAt,monsterCampDamageScale} from '../config/monster-camps.js';
import {forestThreatAt} from './forest-levels.js';
import {outerForestGroves, expandedBiomeAnchors, TreeSpacingIndex} from './forest-expansion.js';
import {enemyMass} from '../config/enemy-mass.js';
import {dumplingSizeName} from '../config/monster-families.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { GAMEPLAY_TABLES } from '../config/gameplay-tables.js';
import { i18nText } from "../i18n/index.js";
// 手工组织的森林生态分区：林地中心、等级带、树种与怪物族群共享配置。
import { canonical, worldDistance } from './coordinates.js';
import { JIUZHAIGOU_ZONES } from './jiuzhaigou.js';
import { pathDistance } from './paths.js';
export { PATHS, pathDistance } from './paths.js';
import { NATURAL_TERRAIN } from './natural-terrain.js';
import { FOREST_VARIANTS } from './landscape-variants.js';
import {coversRealmEntrance} from './realm-entrances.js';
import { thinSceneryTrees, CAMP_EDGE_TREES, coversScenery } from './forest-clearings.js';
export const BIOMES = [
  {
    id: 'meadow',
    name: i18nText("world.biomes.7a12609293"),
    level: 1,
    range: '1–3',
    x: 870,
    y: 750,
    tree: 'round',
    palette: 0,
    color: '#b5d27b',
    monster: '#9fc556',
    species: i18nText("config.story.8c77682946"),
    accent: '#c8da91',
  },
  {
    id: 'pine',
    name: i18nText("world.biomes.bcb2a209e4"),
    level: 4,
    range: '4–6',
    x: 650,
    y: 2100,
    tree: 'pine',
    palette: 1,
    color: '#85b77c',
    monster: '#70adc5',
    species: i18nText("world.biomes.131bd90f4a"),
    accent: '#b5d5d9',
  },
  {
    id: 'amber',
    name: i18nText("world.biomes.7433350e2a"),
    level: 7,
    range: '7–9',
    x: 2340,
    y: 1020,
    tree: 'maple',
    palette: 2,
    color: '#d1b96a',
    monster: '#ce964e',
    species: i18nText("world.biomes.77b7434dd7"),
    accent: '#e0c58c',
  },
  {
    id: 'deep',
    name: i18nText("world.biomes.662d6ece88"),
    level: 10,
    range: '10–12',
    x: 3020,
    y: 2200,
    tree: 'cypress',
    palette: 3,
    color: '#71a47d',
    monster: '#ae80c3',
    species: i18nText("world.biomes.ea5cb064bc"),
    accent: '#cfb5e1',
  },
].map(zone=>({...zone,...forestThreatAt(zone.x,zone.y),name:zone.name}));
// 原四个地点仍供地图导航；外圈锚点只扩展生态场和地面。
export const FOREST_BIOME_ANCHORS = expandedBiomeAnchors(BIOMES);
// 生态区域采用周期性距离场，怪物等级另按营地距离计算。
export function biomeAt(x, y, mapId = 'forest') {
  const p = canonical({ x, y });
  return (mapId === 'jiuzhaigou' ? JIUZHAIGOU_ZONES : FOREST_BIOME_ANCHORS).reduce((a, b) => (worldDistance(p, b) < worldDistance(p, a) ? b : a));
}
// 固定哈希只负责地貌细节，刷新与战斗随机数不会重新洗牌整片森林。
export function terrainNoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}
// 保留六类组合的林团位置和疏密，仅按生态区统一主树种，避免同片树林混杂。
let forestTemplate;
// 静态布局只生成一次；返回独立对象，战场仍可增删树木而不污染后续地面预热。
export function forestLayout() {
  if (forestTemplate) return forestTemplate.map(tree => ({ ...tree }));
  const trees = [], spacingIndex = new TreeSpacingIndex();
  const groves = [
    [170, 170, 155],
    [410, 280, 160],
    [820, 135, 150],
    [1010, 325, 145],
    [890, 500, 120],
    [310, 550, 175],
    [150, 830, 135],
    [420, 1160, 160],
    [850, 1120, 175],
    [1060, 960, 130],
    [1470, 220, 175],
    [1600, 480, 155],
    [1520, 1010, 180],
    [1660, 1240, 130],
    // 新林团沿拓展区域的道路两侧分布，维持树种分区和原有疏密尺度。
    [1900, 180, 175], [2240, 320, 180], [2800, 180, 190], [3200, 330, 180],
    [3430, 540, 145], [1960, 540, 160], [2300, 540, 150], [2890, 500, 170],
    [1920, 960, 180], [2250, 1120, 180], [2880, 1000, 185], [3280, 1130, 190],
    [190, 1530, 170], [480, 1720, 165], [900, 1500, 180], [1620, 1550, 170],
    [1950, 1500, 185], [2300, 1640, 190], [2860, 1520, 175], [3290, 1540, 190],
    [190, 2070, 180], [900, 1960, 180], [1610, 1980, 175], [1940, 2010, 190],
    [2300, 2070, 170], [2830, 2010, 170], [3280, 2090, 200],
    [200, 2500, 190], [830, 2490, 190], [1590, 2510, 180], [1950, 2530, 185],
    [2300, 2500, 190], [2860, 2530, 180], [3290, 2540, 195],
  ];
  groves.push(...outerForestGroves());
  for (const [groveIndex,[cx,cy,r]] of groves.entries()) {
    const anchor=NATURAL_TERRAIN.lakes.reduce((a,b)=>!a?b:worldDistance({x:cx,y:cy},a)<worldDistance({x:cx,y:cy},b)?a:b,null);
    const style=FOREST_VARIANTS.find(v=>v.id===anchor?.forestVariant && worldDistance({x:cx,y:cy},anchor)<570)
      ||FOREST_VARIANTS[groveIndex%6];
    for (let i = 0; i < 24; i++) {
      const a = i * 2.39996,
        radius = Math.sqrt((i + 0.5) / 24) * r * style.spread;
      // 宽林缘可能越过世界边缘，先归一化再检查道路与景观留白。
      const {x,y}=canonical({x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius});
      if (
        pathDistance(x, y) < 66 ||
        Math.hypot(x - 900, y - 700) < 125 ||
        (x > 480 && x < 660 && y > 350 && y < 540)
      )
        continue;
      if (!spacingIndex.accepts({x,y},style.spacing)) continue;
      spacingIndex.add({x,y});
      const zone = biomeAt(x, y);
      trees.push({
        x,
        y,
        variant: zone.tree,
        palette: zone.palette,
        size: 0.85 + terrainNoise(x, y) * 0.25,
        biome: zone.id,
      });
    }
  }
  // 景观疏林后补上通过地标避让的边缘树，所有生成入口共享同一份可复现布局。
  forestTemplate = [...thinSceneryTrees(trees), ...CAMP_EDGE_TREES.filter(tree=>!coversScenery(tree.x,tree.y)).map(tree => {
    const zone = biomeAt(tree.x, tree.y);
    return { ...tree, variant: zone.tree, palette: zone.palette, biome: zone.id };
  })];
  forestTemplate=forestTemplate.filter(t=>!monsterCampClearing(t.x,t.y));
  return forestTemplate.map(tree => ({ ...tree }));
}
// 野外等级由区域决定；清缴可指定基础等级，保留当地配色而不叠加区域属性和奖励。
export function enemyIdentity(x, y, roll = 0.5, mapId = 'forest', fixedLevel = null) {
  // 营地及其周边按营地中心的原始区域等级生成完整属性，避免边缘混入低一级野怪。
  // 清缴、剧情指定等级仍优先；物种与阶级倍率在基础等级计算之后应用。
  const territory = fixedLevel == null ? monsterCampTerritoryAt(x,y,mapId) : null;
  const origin = territory?.levelOrigin || territory || {x,y};
  const zone = biomeAt(x, y, mapId),
    rank = roll > GAMEPLAY_VALUES.enemy.eliteRollThreshold ? 2 : roll > GAMEPLAY_VALUES.enemy.toughRollThreshold ? 1 : 0,
    level = fixedLevel ?? (mapId==='forest'?forestThreatAt(origin.x,origin.y).level:biomeAt(origin.x,origin.y,mapId).level + Math.floor(terrainNoise(Math.floor(origin.x / GAMEPLAY_VALUES.enemy.levelNoiseCell), Math.floor(origin.y / GAMEPLAY_VALUES.enemy.levelNoiseCell)) * GAMEPLAY_VALUES.enemy.zoneLevelSpan));
  return {
    biome: zone.id,
    level,
    rank,
    tough: rank > 0,
    name: dumplingSizeName(rank),
    color: zone.monster,
    accent: zone.accent,
    mass: enemyMass(),
    hp: enemyLevelHealth(level,GAMEPLAY_TABLES.enemyHealthByRank[rank]),
    // 营地范围内共用等级攻击加成；指定等级的清缴、剧情及范围外野怪保留原曲线。
    damage: Math.round((GAMEPLAY_VALUES.enemy.baseDamage + (level - 1) * GAMEPLAY_VALUES.enemy.damagePerLevel) * GAMEPLAY_TABLES.enemyDamageByRank[rank] * (territory ? monsterCampDamageScale(level) : 1)),
    speed: GAMEPLAY_VALUES.enemy.baseSpeed + level * GAMEPLAY_VALUES.enemy.speedPerLevel - rank * GAMEPLAY_VALUES.enemy.rankSpeedPenalty,
    reward: GAMEPLAY_VALUES.enemy.baseReward + ((fixedLevel ?? (mapId==='forest'?level:zone.level)) - 1) * GAMEPLAY_VALUES.enemy.rewardPerZoneLevel + rank * GAMEPLAY_VALUES.enemy.rewardPerRank,
  };
}

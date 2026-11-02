import { i18nText } from "../i18n/index.js";
// 从原森林选择完整干地区域；只复制会话树木，地形、建筑和昼夜仍走主场景绘制。
// 秘境选场维持原生活圈，扩展森林不增加入场密采样开销。
import { ORIGINAL_WORLD as WORLD } from '../world/coordinates.js';
import { settlementAt } from '../world/settlements.js';
import { REALM_RADIUS } from '../config/realms.js';
import { guardianPads } from '../config/guardian.js';
import { terrainBlocked } from '../physics/terrain-navigation.js';
import { towerRealmLandmark } from '../world/realm-entrances.js';

let sites;
// 整个干地战斗圈避开生活聚落，护栏外再留二十四单位，避免圈边贴住营地。
export function realmSites() {
  if (sites) return sites;
  sites = [];
  const radius = REALM_RADIUS;
  // 重叠战斗圈共用 24 单位采样格，首次检查后复用地形结果；建完候选点即释放。
  // 半径包含平方根，格索引取整消除加减半径产生的浮点尾差。
  const columns=Math.ceil(WORLD.width/24),terrain=new Uint8Array(columns*Math.ceil(WORLD.height/24));
  for (let y = radius + 24; y < WORLD.height - radius - 24; y += 24)
    for (let x = radius + 24; x < WORLD.width - radius - 24; x += 24) {
      // 密采样保留营地外狭窄的合法落点，爬塔仍有不同选区可轮换；结果只建立一次。
      if (settlementAt({ x, y }, radius + 24)) continue;
      let dry = true;
      for (let dy = -radius; dy <= radius && dry; dy += 24)
        for (let dx = -radius; dx <= radius; dx += 24)
          if (dx * dx + dy * dy <= radius * radius) {
            const index=Math.round((y+dy)/24)*columns+Math.round((x+dx)/24);
            if(!terrain[index])terrain[index]=terrainBlocked(x+dx,y+dy,24)?2:1;
            if(terrain[index]===2){dry=false;break;}
          }
      if (dry) sites.push(Object.freeze({ x, y, radius, terrain: 'forest' }));
    }
  if (!sites.length) throw Error(i18nText("core.realm-region.54a778aa48"));
  return Object.freeze(sites);
}
// 存档只接受已验证主场景选区，拒绝任意修改范围或落点。
export function validRealmArena(raw) {
  if (!raw) return null;
  const site = realmSites().find(p => p.x === raw.x && p.y === raw.y && p.radius === raw.radius);
  return site ? { ...site } : null;
}
// 刷新保留有效选区；爬塔换层排除原点，并优先选择不重叠的干地区域。
export function chooseRealmArena(random, saved, previous = null) {
  const restored = validRealmArena(saved);
  if (restored) return restored;
  const candidates = realmSites().filter(p => !previous || p.x !== previous.x || p.y !== previous.y);
  if (!candidates.length) throw Error(i18nText("core.realm-region.41b604cac4"));
  const distant = previous ? candidates.filter(p => Math.hypot(p.x - previous.x, p.y - previous.y) >= p.radius + previous.radius) : [];
  const pool = distant.length ? distant : candidates;
  return { ...pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))] };
}
// 复用森林生成的树木，仅清出出生点、女神和预设格位；不修改冻结的森林原对象。
export function prepareRealmTrees(trees, realm) {
  const a = realm.arena, pads = guardianPads(a);
  const tower = realm.mode === 'tower' ? towerRealmLandmark(a) : null;
  return trees.filter(tree => {
    if (Math.hypot(tree.x - a.x, tree.y - a.y) < 100) return false;
    // 按完整树冠给高塔与门前留白，避免树干虽未相交但树冠遮住建筑。
    if (tower && Math.abs(tree.x - tower.x) < tower.width / 2 + 80 &&
        tree.y > tower.y - tower.height - 35 && tree.y < tower.y + 210) return false;
    if (realm.mode !== 'guardian') return true;
    return !pads.some(p => Math.hypot(p.x - tree.x, p.y - tree.y) < 95);
  });
}

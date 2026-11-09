import {createRenderCanvas,watchRenderCanvas} from './canvas-recovery.js';
import { onArtStyleChange } from '../art-styles/state.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { releaseArtCache } from '../art-styles/cache.js';
import { canvasFont } from './text-style.js';
import { i18nText } from '../i18n/index.js';
import {
  storyDefinition,
  storyNode,
  storyCondition,
  storyValue,
  storyPosition,
  storySceneActive,
} from '../core/story/story-definition.js';
import { box, oval, poly } from './primitives.js';
import { catSprites, catFrame, RESIDENT_PORTRAIT_SCALE, scaleResidentForWorld } from './cat-animation.js';
import { HEROES } from '../config/heroes.js';
import { nearest } from '../world/coordinates.js';
import { blocked } from '../physics/motion.js';
import { drawSlime } from './enemies.js';
import { drawNewBoss } from './bosses.js';

// 章节摆件与人物调用正式绘制链；底座按脚底排序，任务方向不烘焙入场景。

let GREEN = style.storyProps.materialColor;
const mintMotion = { idleTime: 0, moveTime: 0, moveWeight: 0 };
const propAtlas = new Map();
const mintFrames = new Map();
// 共用绘制与动作输入，风格差异由配置提供。
export function storyArtStats() {
  return {
    atlases: propAtlas.size,
    mintFrames: [...mintFrames.keys()].filter((k) => k.startsWith('1:')).length,
    npcFrames: mintFrames.size,
    bytes: propAtlas.size * 112 * 128 * 4 + mintFrames.size * 144 * 160 * 4,
    limit: 16 * 112 * 128 * 4 + 40 * 144 * 160 * 4,
  };
}
// 共用绘制与动作输入，风格差异由配置提供。
export function storyCast(game) {
  const r = game.story;
  if (!storySceneActive(game)) return [];
  const def = storyDefinition(game),
    cast = (storyNode(game).actors || [])
      .filter((a) => storyCondition(r, a.when))
      .map((a) => {
        const actor = def.actors[a.actor];
        return {
          ...storyPosition(a, game),
          kind: actor.kind,
          sceneNpcId:actor.residentId?'resident:'+actor.residentId:'story:'+def.id+':'+a.actor,
          residentId:actor.residentId,
          actorHero: actor.hero,
          ...(actor.appearance ? { appearance: actor.appearance } : {}),
        };
      });
  // 交谈时按照人物表的侧让距离避开车身，不新增碰撞。
  return cast.map((actor) => {
    const p = nearest(actor, game.player),
      spec = Object.values(def.actors).find((a) => a.kind === actor.kind);
    if (r.dialogue && Math.hypot(p.x - game.player.x, p.y - game.player.y) < def.cleanup.scene.actorAsideDistance) {
      const aside = { ...actor, x: game.player.x + spec.aside, y: p.y };
      // 狭窄岸边按人物表检查侧让位置；水面、护栏或树干受阻就保留已验证的站位。
      if (
        !spec.avoidTerrain ||
        !blocked(aside.x, aside.y, 16, game.trees, { mapId: game.mapId, worldBarriers: game.player.worldBarriers })
      )
        return aside;
    }
    return actor;
  });
}
// 共用绘制与动作输入，风格差异由配置提供。
export function storyObjects(game) {
  if (!storySceneActive(game)) return [];
  const r = game.story;
  // 仅复制绘制字段，配置条件和绑定表达式不会进入渲染实体。
  const objects = (specs) =>
    specs
      .filter((p) => storyCondition(r, p.when))
      .map((p) => {
        const { site, dx, dy, when, bind, ...shape } = p;
        return {
          ...storyPosition(p, game),
          ...shape,
          ...Object.fromEntries(Object.entries(bind || {}).map(([key, value]) => [key, storyValue(r, value)])),
        };
      });
  return [...objects(storyDefinition(game).props), ...storyCast(game), ...objects(storyNode(game).props || [])].map(
    (o) => ({ ...o, type: 'story-prop' }),
  );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawStoryProp(c, item, time, night = 0, reduced = false, player = null) {
  // 照料花盆采用固定底座和独立叶片，脚底排序与原摆件一致。
  if(item.kind==='seedling'){c.save();c.translate(item.x,item.y);oval(c,0,3,20,7,'#81937b');box(c,-16,-18,32,21,5,'#c9a977','#52765a',2);oval(c,0,-18,16,5,'#8b795a','#52765a',2);poly(c,[[0,-18],[-2,-39],[1,-40],[3,-18]],'#52765a');oval(c,-8,-33,10,5,'#9abd83','#52765a',1.5);oval(c,8,-40,10,5,'#b8ce93','#52765a',1.5);c.restore();return;}
  // 友善怪物读取外观表并复用正式动作绘制，不建立攻击、血条或掉落实体。
  if (item.appearance) {
    const a = item.appearance,
      entity = { ...a, x: item.x, y: item.y, phase: 0, hp: 1, maxHp: 1, radius: 17 };
    if (a.type === 'boss') drawNewBoss(c, entity, time, reduced);
    else drawSlime(c, entity, time, reduced);
    return;
  }
  const actor = Number.isInteger(item.actorHero) ? { hero: item.actorHero } : null;
  if (actor) {
    if (catSprites.status !== 'ready') throw Error(i18nText('rendering.story-props.55bf7840f6'));
    const hero = actor.hero,
      action = catSprites.manifest.heroes[HEROES[hero].sprite].actions.idle;
    const frame = `${hero}:${catFrame(action, time, reduced)}`;
    let atlas = mintFrames.get(frame);
    if (!atlas) {
      atlas =
        typeof OffscreenCanvas === 'function'
          ? watchRenderCanvas(new OffscreenCanvas(144, 160))
          : Object.assign(createRenderCanvas(), { width: 144, height: 160 });
      const context = atlas.getContext('2d');
      // 在原缓存内扩大世界取景，完整容纳放大后的猫耳、围巾与尾巴。
      context.scale(1.5, 1.5);
      drawStoryShape(context, { ...item, x: 48, y: 80 }, time, night, reduced);
      if (mintFrames.size >= 40) mintFrames.delete(mintFrames.keys().next().value);
      mintFrames.set(frame, atlas);
    }
    c.drawImage(atlas, item.x - 48, item.y - 80, atlas.width/1.5, atlas.height/1.5);
    return;
  }
  const key = `${item.kind}:${item.label || ''}:${!!item.restored}:${item.parts || 0}:${night > 0.5}`;
  let atlas = propAtlas.get(key);
  if (!atlas) {
    atlas =
      typeof OffscreenCanvas === 'function'
        ? watchRenderCanvas(new OffscreenCanvas(112, 128))
        : Object.assign(createRenderCanvas(), { width: 112, height: 128 });
    drawStoryShape(atlas.getContext('2d'), { ...item, x: 56, y: 96, hp: undefined }, time, night, reduced);
    if (propAtlas.size >= 16) propAtlas.delete(propAtlas.keys().next().value);
    propAtlas.set(key, atlas);
  }
  c.save();
  if (item.kind === 'relay' && player && player.y < item.y && Math.hypot(player.x - item.x, player.y - item.y) < 80)
    c.globalAlpha = 0.5;
  c.drawImage(atlas, item.x - 56, item.y - 96);
  if (item.kind === 'relay' && Number.isFinite(item.hp)) {
    box(c, item.x - 33, item.y + 17, 66, 6, 3, '#47604c');
    box(c, item.x - 32, item.y + 18, (64 * Math.max(0, item.hp)) / 300, 4, 2, '#c8dfa0');
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawStoryShape(c, item, time, night = 0, reduced = false) {
  c.save();
  c.translate(item.x, item.y);
  const wood = night > 0.5 ? '#927851' : '#be9b65',
    cream = night > 0.5 ? '#c4c6a1' : '#f4e7ba';
  oval(c, 5, 5, item.kind === 'relay' ? 42 : 26, 10, '#29423535');
  const actor = Number.isInteger(item.actorHero) ? { hero: item.actorHero } : null;
  if (actor) {
    scaleResidentForWorld(c);
    c.scale(RESIDENT_PORTRAIT_SCALE, RESIDENT_PORTRAIT_SCALE);
    mintMotion.idleTime = time;
    if (!catSprites.draw(c, actor.hero, mintMotion, { bodyX: 0, bodyY: 0 }, reduced))
      throw Error(i18nText('rendering.story-props.55bf7840f6'));
  } else if (item.kind === 'relay') {
    box(c, -38, -15, 76, 26, 7, '#69816a', GREEN, style.storyProps.drawStoryShapeValue);
    box(c, -32, -64, 64, 51, 8, wood, GREEN, style.storyProps.drawStoryShapeValue2);
    box(c, -27, -60, 54, 9, 3, cream, GREEN, 1.5);
    for (const x of [-17, 17]) {
      box(c, x - 8, -48, 16, 25, 5, '#779b86', GREEN, style.storyProps.drawStoryShapeValue);
      for (let y = -43; y < -25; y += 6) {
        c.beginPath();
        c.moveTo(x - 9, y);
        c.lineTo(x + 9, y - 3);
        c.strokeStyle = cream;
        c.lineWidth = 2;
        c.stroke();
      }
    }
    box(c, -4, -86, 8, 24, 3, wood, GREEN, style.storyProps.drawStoryShapeValue);
    oval(c, 0, -87, 8, 8, item.restored ? '#f6df8e' : '#8ca085', GREEN, style.storyProps.drawStoryShapeValue);
    for (let i = 0; i < 3; i++)
      box(c, -21 + i * 16, -12, 10, 6, 2, item.parts > i || item.restored ? '#e2d77d' : '#4b6a58', GREEN, 1);
    if (Number.isFinite(item.hp)) {
      box(c, -33, 17, 66, 6, 3, '#47604c');
      box(c, -32, 18, (64 * Math.max(0, item.hp)) / 300, 4, 2, '#c8dfa0');
    }
  } else if (item.kind === 'medicine') {
    box(c, -24, -25, 48, 29, 5, '#dbe4bc', GREEN, style.storyProps.drawStoryShapeValue);
    box(c, -12, -33, 24, 9, 3, wood, GREEN, style.storyProps.drawStoryShapeValue);
    box(c, -7, -22, 14, 22, 2, '#618d6c');
    box(c, -15, -16, 30, 10, 2, '#618d6c');
  } else if (item.kind === 'crate') {
    box(c, -24, -24, 48, 28, 5, wood, GREEN, style.storyProps.drawStoryShapeValue);
    box(c, -25, item.restored ? -38 : -28, 50, 10, 4, cream, GREEN, style.storyProps.drawStoryShapeValue);
    box(c, -4, -23, 8, 18, 2, '#6e8c65', GREEN, 1.5);
  } else {
    box(c, -5, -36, 10, 41, 3, wood, GREEN, style.storyProps.drawStoryShapeValue);
    box(c, -24, -59, 48, 31, 5, cream, GREEN, style.storyProps.drawStoryShapeValue2);
    if (item.kind === 'mail') {
      poly(
        c,
        [
          [-16, -50],
          [16, -50],
          [16, -34],
          [-16, -34],
        ],
        '#d7dfba',
        GREEN,
        1.5,
      );
      c.beginPath();
      c.moveTo(-16, -50);
      c.lineTo(0, -40);
      c.lineTo(16, -50);
      c.strokeStyle = GREEN;
      c.stroke();
      oval(c, 20, -58, 5, 5, item.restored ? '#ecd878' : '#73966d', GREEN, 1);
    } else if (item.kind === 'route') {
      c.fillStyle = GREEN;
      c.font = canvasFont(12);
      c.textAlign = 'center';
      c.fillText(item.label, 0, -39);
    } else {
      poly(
        c,
        [
          [-13, -48],
          [12, -48],
          [12, -54],
          [21, -42],
          [12, -32],
          [12, -38],
          [-13, -38],
        ],
        '#76946b',
        GREEN,
        1,
      );
      box(c, -3, -34, 8, 17, 2, '#cce3d4', GREEN, 1);
    }
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function clearArtStyleCache() {
  releaseArtCache(propAtlas);
  releaseArtCache(mintFrames);
}

// 同步共享模块顶层的材质常量，后续绘制立即使用新配置。
onArtStyleChange(() => {
  GREEN = style.storyProps.materialColor;
});

// 装备故事借用常驻人物时，原作息位置不再同时绘制同一居民。
export function storyResidentIds(game){
 if(!game.story)return new Set();const def=storyDefinition(game);
 return new Set((storyNode(game).actors||[]).filter(a=>storyCondition(game.story,a.when)).map(a=>def.actors[a.actor]?.residentId).filter(Boolean));
}

import {createCurrentCat} from './current-cat.js';
import {equipmentLevelCap} from '../config/legendary-workshop.js';
import {heroGrowthMarkup} from './hero-growth.js';
import {challengeLevelMarkup} from './challenge-feedback.js';
import {campPurchasePrice} from '../progression/camp-level.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { i18nText, i18nHtml } from "../i18n/index.js";
import { isSummonEnergy, summonRegenRate } from '../config/summon-energy.js';
import { weaponGrowth, heroHealth, upgradeHint, challengeDescription, economyFor, requiredTier } from '../config/economy.js';
import { equipmentRecipe } from '../progression/equipment-goals.js';
import { drawWorkshopEquipment } from '../rendering/workshop.js';
// 营地养成与图标控制器，规则来自 progression，画像来自独立绘制模块。
import { workshopWeapons } from '../config/weapon-categories.js';
import { renderWeaponCategories } from './weapon-category-icons.js';
import { HEROES } from '../config/heroes.js';
import { catSprites } from '../rendering/cat-animation.js';
import { WEAPONS, isWeaponUnlocked } from '../config/weapons.js';
import { effectiveWeapon, masteryInfo, WEAPON_MODS, MOD_COST } from '../config/weapon-mods.js';
import { upgradeCost } from '../progression/progress.js';
import { drawCat, drawWeapon } from '../rendering/characters.js';
import { funnelWeapon } from '../config/funnel-loadouts.js';
import { drawFunnelIcon } from '../rendering/funnel.js';
import {challengeRankIcon} from '../rendering/challenge-rank.js';
import { requirementsMarkup } from './equipment-goals.js';
import { canPurchaseEquipment } from '../progression/equipment-goals.js';
import { priceIcons } from '../rendering/resource-icons.js';
import { upgradePriceMarkup } from './upgrade-price.js';
import { createEventScope } from '../platform/events.js';
// 工坊显示永久熟练度与二选一改装，按钮条件与规则事务共享门槛和价格。
function weaponProgressMarkup(progress, index) {
  const mastery = masteryInfo(progress, index),
    selected = progress.mods[index];
  const fill = mastery.next ? (mastery.xp - mastery.floor) / (mastery.next - mastery.floor) : 1;
  const canModify =
    mastery.level >= 2 && progress.coins >= MOD_COST.coins && progress.wood >= MOD_COST.wood;
  const branches = WEAPON_MODS[index]
    .map(
      (mod, i) =>
        `<button class="mod-choice ${selected === i + 1 ? 'active' : ''}" data-mod="${i + 1}" data-index="${index}" aria-pressed="${selected === i + 1}" ${!canModify || selected === i + 1 ? 'disabled' : ''}><b>${selected === i + 1 ? '✓ ' : ''}${mod.name}</b><span>${mod.description}</span></button>`,
    )
    .join('');
  return `<section class="weapon-mastery" aria-label="${i18nHtml("ui.inventory.0cfc65ed8b", { p0: (WEAPONS[index].name) })}"><div class="mastery-heading"><b>${i18nHtml("ui.inventory.0988e2d0b3", { p0: (mastery.level) })}</b><span>${i18nHtml("ui.inventory.1c68e40c91", { p0: (mastery.next ? `${mastery.xp} / ${mastery.next}` : i18nText("ui.inventory.7bd3752e09")), p1: ((mastery.level - 1) * 2) })}</span></div><div class="mastery-track" role="progressbar" aria-label="${i18nHtml("ui.inventory.89410cfe4a")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fill * 100)}"><i style="width:${fill * 100}%"></i></div><small>${i18nHtml("ui.inventory.8700e07e97")}</small><div class="mod-heading"><b>${i18nHtml("ui.inventory.22e3c80bbf")}</b>${selected ? `<button data-mod="0" data-index="${index}">${i18nHtml("ui.inventory.a633ee3abb")}</button>` : `<span>${i18nHtml("config.weapon-mods.e49deec22c")}</span>`}</div><div class="mod-choices">${branches}</div><small>${mastery.level < 2 ? i18nText("ui.inventory.9fc34de344") : i18nText("ui.inventory.cacb066cad", { p0: (MOD_COST.coins), p1: (MOD_COST.wood) })}</small></section>`;
}
// 注入游戏、页面和弹窗服务，同一控制器可以完整销毁并重新绑定。
export function createInventory({ game, root, dialogs, onChange, onInventoryRender, onCleanup }) {
  const $ = (id) => root.getElementById(id),
    scope = createEventScope();
  const expandedWeapons = new Set();
  let category = 'all';
  let tab = 'weapons',
    lastInventory = '',
    lastFieldIcons = '',
    lastIntro = '';
  // 开始页展示实际装备及等级，仅在换枪或升级后重绘高清枪械画像。
  function renderIntro() {
    const p = game.progress,
      weapon = effectiveWeapon(p);
    const signature = `${p.weapon}:${p.weapons[p.weapon]}:${p.mods[p.weapon]}:${p.mastery[p.weapon]}:${JSON.stringify(p.funnelLoadout)}:${p.spiderLoadout}:${JSON.stringify(p.weaponParts)}`;
    if (signature === lastIntro) return;
    lastIntro = signature;
    $('intro-weapon-name').textContent = weapon.name;
    $('intro-weapon-level').textContent = i18nText("common.level", { p0: p.weapons[p.weapon] });
    $('intro-weapon-description').textContent = weapon.description;
    $('intro-weapon-ammo').textContent =
      `${weapon.independentSupply ? '3 × ' : ''}${weapon.magazineSize} ${weapon.resourceType === 'energy' ? i18nText("ui.inventory.06f2f8e0a8") : i18nText("ui.inventory.05b5d32c72")}`;
    $('intro-weapon-reload').textContent = isSummonEnergy(weapon)?i18nText("ui.inventory.7fa5be9778", { p0: (summonRegenRate(weapon).toFixed(2)) }):i18nText("ui.hud.67d54f9c74", { p0: (weapon.reloadTime.toFixed(1)) });
    $('intro-resource-label').textContent = weapon.resourceType === 'energy' ? i18nText("ui.inventory.9196f0338a") : i18nText("ui.inventory.f16f121dc0");
    $('intro-reload-label').textContent = isSummonEnergy(weapon)?i18nText("ui.inventory.964669e7ae"):weapon.independentSupply
      ? i18nText("ui.inventory.e1ca1dad0a")
      : weapon.resourceType === 'energy'
        ? i18nText("ui.inventory.c0c253c271")
        : i18nText("ui.inventory.eea36850d9");
    if (weapon.independentSupply && p.funnelLoadout.some((index) => index !== 12)) {
      const modules = [0, 1, 2].map((i) => funnelWeapon(p, i));
      $('intro-weapon-description').textContent = modules
        .map((w, i) => i18nText("ui.inventory.1dd621326e", { p0: (i + 1), p1: (w.id === 'funnel' ? i18nText("ui.inventory.9bd41909b7") : w.name) }))
        .join(' · ');
      $('intro-resource-label').textContent = i18nText("ui.inventory.a4f5cbe101");
      $('intro-weapon-ammo').textContent = modules.map((w) => w.magazineSize).join(' / ');
      $('intro-weapon-reload').textContent =
        modules.map(w=>isSummonEnergy(w)?i18nText("ui.inventory.fe1cdd24e8", { p0: (summonRegenRate(w).toFixed(2)) }):i18nText("ui.inventory.e9dc5dd213", { p0: (w.reloadTime.toFixed(1)) })).join(' · ');
      $('intro-reload-label').textContent=i18nText("ui.inventory.f68eafd7c0");
    }
    if(weapon.attackKind==='defense'){$('intro-weapon-ammo').textContent=weapon.magazineSize+' 点护盾';$('intro-weapon-reload').textContent='每秒恢复 '+weapon.shieldRegen+' 点';}
    const canvas = $('intro-weapon-icon'),
      c = canvas.getContext('2d');
    canvas.setAttribute('aria-label', i18nText("ui.inventory.c98171e6c2", { p0: (weapon.name) }));
    c.clearRect(0, 0, canvas.width, canvas.height);
    if (['mechanical','spider'].includes(weapon.controller)) { drawWorkshopEquipment(c,p,'weapons',p.weapon); return; }
    if (['funnel', 'drone'].includes(weapon.controller)) {
      drawFunnelIcon(c, canvas.width / 2, 140, 3.3, weapon.controller);
      return;
    }
    c.save();
    c.translate(p.weapon >= 8 ? 248 : 320, 150);
    c.rotate(-0.25);
    drawWeapon(c, p.weapon, 0, 0, p.weapon >= 8 ? 5 : 6, 0, 0, 0, effectiveWeapon(p).modChoice);
    c.restore();
  }
  // 数据变化时重绘营地卡片，避免每帧替换 DOM。
  function renderInventory() {
    // 隐藏营地不序列化整份逐帧变化的存档，也不重建卡片和画像；打开时立即取最新数据。
    if (!$('camp-dialog').open) return;
    const p = game.progress,
      signature = JSON.stringify([tab, category, {...p,economyLog:undefined}, catSprites.status]);
    if (signature === lastInventory) return;
    lastInventory = signature;
    const heroes = tab === 'heroes',
      list = heroes ? HEROES.map((_, index) => index) : workshopWeapons(p, category),
      selected = heroes ? p.hero : p.weapon;
    $('weapon-categories').hidden = heroes;
    $('weapon-category-hint').hidden = heroes;
    if (!heroes) renderWeaponCategories($('weapon-categories'), category, p.vehicleIndex);
    $('inventory').innerHTML = list
      .map((index) => {
        const item = heroes ? HEROES[index] : effectiveWeapon(p, index);
        const level = p[tab][index],
          equipped = level && selected === index,
          cost = level ? upgradeCost(level,p,heroes?'heroes':'weapons',index) : heroes?campPurchasePrice(p,item):equipmentRecipe('weapons',index,p);
        const unlocked = heroes || !!level || isWeaponUnlocked(p, index);
        const requirement = !level ? heroes?challengeLevelMarkup(p):requirementsMarkup(p, 'weapons', index) : '';
        const afford = !heroes && !level ? canPurchaseEquipment(p, 'weapons', index)
          : p.coins >= cost.coins && p.wood >= cost.wood,
          maxed = level >= equipmentLevelCap(p,tab);
        const stats = heroes
          ? `${i18nHtml("ui.inventory.45bc77bc1c")} <b>${heroHealth(item.hp,level,p)}</b></span><span>${i18nHtml("ui.inventory.8d80b1f458")} <b>${item.speed}</b>`
          : item.attackKind==='defense'?`护盾容量 <b>${item.magazineSize}</b></span><span>每秒恢复 <b>${item.shieldRegen}</b></span><span>破盾等待 <b>${item.shieldBreakDelay} 秒</b>`
          : `${['funnel', 'drone'].includes(item.controller) ? i18nText("ui.inventory.d0f2f4ee8b") : i18nText("ui.inventory.30e1196888")} <b>${Math.round(item.damage * weaponGrowth(level,p))}</b></span><span>${['funnel', 'drone'].includes(item.controller) ? i18nText("ui.inventory.83c483ddb9") : i18nText("ui.inventory.b6e5c86950")} <b>${i18nHtml("ui.inventory.fe1cdd24e8", { p0: ((1 / item.interval).toFixed(1)) })}</b></span><span>${i18nHtml("ui.inventory.5262a412ad")} <b>${item.range}</b></span><span>${item.independentSupply ? i18nText("ui.inventory.abd8fc9945") : item.resourceType === 'energy' ? (item.controller ? i18nText("ui.inventory.7b692d13e8") : i18nText("ui.inventory.1c69b1aa72")) : i18nText("ui.inventory.f16f121dc0")} <b>${item.magazineSize}</b></span><span>${isSummonEnergy(item)?i18nText("ui.inventory.964669e7ae"):item.independentSupply ? i18nText("ui.inventory.e470d32779") : item.resourceType === 'energy' ? i18nText("ui.inventory.c0c253c271") : i18nText("ui.inventory.eea36850d9")} <b>${isSummonEnergy(item)?i18nText("ui.inventory.7fa5be9778", { p0: (summonRegenRate(item).toFixed(2)) }):i18nText("ui.hud.67d54f9c74", { p0: (item.reloadTime.toFixed(1)) })}</b>`;
        return `<article class="item-card ${equipped ? 'equipped' : ''}">${!heroes && equipped ? `<div class="equipped-heading">${i18nHtml("ui.inventory.96dab22a52")}</div>` : ''}<div class="item-top"><canvas class="portrait" width="240" height="200" data-portrait="${index}" aria-label="${i18nHtml("ui.inventory.7114abdbaf", { p0: (item.name) })}"></canvas><div class="item-title"><h3>${item.name}<span class="level">${level ? i18nHtml("common.level", { p0: level }) : i18nText("ui.inventory.2f0baebfe7")}</span></h3><small>${heroes ? item.breed : item.title}</small><span class="item-tag">${heroes ? item.trait : item.description}</span></div></div>${!heroes && index === 12 ? `<small class="module-note">${i18nHtml("ui.inventory.77fdd14c4d")}</small>` : ''}<div class="item-stats ${heroes?'hero-stats':''} ${!heroes && ['funnel', 'drone'].includes(item.controller) ? 'funnel-stats' : ''}"><span>${stats}</span></div>${heroes?heroGrowthMarkup(p,index):''}${!heroes && index === 12 && level ? `<button class="funnel-config-button" data-funnel-config aria-haspopup="dialog" aria-controls="funnel-dialog">${i18nHtml("ui.inventory.5ecea50c3e")} <span>${i18nHtml("ui.inventory.1df0da7f6b")}</span></button>` : ''}${heroes || !level || item.attackKind==='defense' ? '' : `<details class="weapon-details" data-weapon-details="${index}" ${expandedWeapons.has(index) ? 'open' : ''}><summary>${i18nHtml("ui.inventory.8f8129e9b4", { p0: (masteryInfo(p, index).level) })}</summary>${weaponProgressMarkup(p, index)}</details>`}${requirement}<div class="card-buttons">${level ? `<button class="equip ${equipped ? 'equipped-label' : ''}" data-action="equip" data-index="${index}" ${equipped ? 'disabled' : ''}>${equipped ? i18nText("ui.inventory.19d9d1b544") : heroes ? i18nText("ui.inventory.95b16460ff") : i18nText("ui.inventory.36ab55267a")}</button>` : ''}<button ${!level&&!heroes?'data-shop-kind="weapons" data-shop-index="'+index+'" data-shop-name="'+item.name+'"':''} data-action="${level ? 'upgrade' : 'buy'}" data-index="${index}" ${!afford || maxed || !unlocked ? 'disabled' : ''} title="${!unlocked ? challengeDescription(economyFor(p).weapons[index].gate,economyFor(p)) : maxed ? i18nText("ui.inventory.523372b9bb") : i18nText("ui.inventory.f15aec2029", { p0: (cost.coins), p1: (cost.wood) })}">${!unlocked ? challengeRankIcon(requiredTier(cost.gate,economyFor(p)))+i18nText("ui.inventory.8a558786cc") : maxed ? i18nText("progression.workshop.d6d8e1de4a") : level ? i18nText("ui.inventory.4b17c59d2f", { p0: (upgradeHint(p,heroes?'heroes':'weapons',index,level)) }) : heroes ? i18nText("ui.inventory.79c0549e4f") : '加入购物车'}${maxed ? '' : `<span class="cost">${level ? upgradePriceMarkup(p,heroes?'heroes':'weapons',index,level) : priceIcons(cost)}</span>`}</button></div></article>`;
      })
      .join('');
    root.querySelectorAll('[data-weapon-details]').forEach((details) => {
      details.ontoggle = () => {
        const index = Number(details.dataset.weaponDetails);
        if (details.open) expandedWeapons.add(index);
        else expandedWeapons.delete(index);
      };
    });
    root.querySelectorAll('[data-portrait]').forEach((canvas) => {
      const c = canvas.getContext('2d'),
        index = Number(canvas.dataset.portrait);
      c.clearRect(0, 0, 240, 200);
      if (heroes) drawCat(c, 120, 154, index, -0.1, 2.4, 0, p.weapon);
      else if (['mechanical','spider'].includes(WEAPONS[index].controller)) drawWorkshopEquipment(c,p,'weapons',index);
      else if (['funnel', 'drone'].includes(WEAPONS[index].controller))
        drawFunnelIcon(c, 120, 95, 2, WEAPONS[index].controller);
      else {
        c.save();
        c.translate(index >= 8 ? 93 : 120, 100);
        c.rotate(-0.35);
        drawWeapon(c, index, 0, 0, index >= 8 ? 2.3 : index ? 3.2 : 3.7, 0, 0, 0, effectiveWeapon(p, index).modChoice);
        c.restore();
      }
    });
  }
  // 战场头像只在装备改变后重绘。
  function renderFieldIcons() {
    const p = game.loadout,
      signature = `${p.hero}:${p.weapon}:${catSprites.status}`;
    if (signature === lastFieldIcons) return;
    lastFieldIcons = signature;
    const hero = $('hero-button-icon').getContext('2d');
    hero.clearRect(0, 0, 112, 112);
    drawCat(hero, 56, 91, p.hero, -0.15, 1.65, 0, p.weapon);
    const weapon = $('weapon-button-icon').getContext('2d');
    weapon.clearRect(0, 0, 112, 112);
    if (['funnel', 'drone'].includes(WEAPONS[p.weapon].controller)) {
      drawFunnelIcon(weapon, 56, 54, 1, WEAPONS[p.weapon].controller);
      return;
    }
    weapon.save();
    weapon.translate(p.weapon >= 8 ? 40 : 54, 56);
    weapon.rotate(-0.4);
    drawWeapon(weapon, p.weapon, 0, 0, p.weapon >= 8 ? 1.15 : p.weapon ? 1.9 : 2.2, 0, 0, 0, effectiveWeapon(p).modChoice);
    weapon.restore();
  }
  // 切换标签时同步无障碍状态。
  function switchTab(next) {
    if (next === 'weapons' && tab !== next) category = 'all';
    tab = 'weapons';

    root.querySelector('#tab-weapons span').textContent = String(WEAPONS.length).padStart(2, '0');
    $('camp-title').textContent = tab === 'heroes' ? i18nText("ui.inventory.2a6ad2fe8a") : i18nText("ui.inventory.235d93ed3b");
    root.querySelectorAll('[data-tab]').forEach((b) => {
      b.classList.toggle('selected', b.dataset.tab === tab);
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
      b.tabIndex = b.dataset.tab === tab ? 0 : -1;
    });
    $('inventory').setAttribute('aria-labelledby', `tab-${tab}`);
    renderInventory();
  }
  // 新存档重置缓存，避免相同装备索引留下旧卡片。
  // 只失效美术签名，切换风格不改变当前页签、分类和展开项目。
  function invalidateArt(){lastInventory='';lastFieldIcons='';lastIntro='';}
  function reset() {
    category = 'all';
    expandedWeapons.clear();
    lastInventory = '';
    lastFieldIcons = '';
    lastIntro = '';
    $('camp-feedback').textContent = '';
    switchTab('weapons');
  }
  dialogs.register('camp-dialog', {
    onOpen: () => {
      $('camp-feedback').textContent = '';
    },
    focusId: 'close-camp',
  });
  for (const [id, kind] of [

    ['weapons-button', 'weapons'],
  ])
    scope.on($(id), 'click', () => {
      if (kind === 'weapons') category = 'all';
      switchTab(kind);
      $('camp-dialog').querySelector('.ui-panel__body').scrollTop = 0;
      dialogs.open('camp-dialog');
    });
  // 主菜单先查看当前猫猫，猫窝管理入口保持在建筑内。
  const currentCat=createCurrentCat({game,root,dialogs,onInventoryRender,onCleanup});
  for (const id of ['close-camp', 'camp-done'])
    scope.on($(id), 'click', () => dialogs.close('camp-dialog'));
  root.querySelectorAll('[data-tab]').forEach((button) => {
    scope.on(button, 'click', () => switchTab(button.dataset.tab));
    scope.on(button, 'keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        switchTab(tab === 'heroes' ? 'weapons' : 'heroes');
        $(`tab-${tab}`).focus();
      }
    });
  });
  scope.on($('weapon-categories'), 'click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button || button.dataset.category === 'vehicles') return;
    category = button.dataset.category;
    renderInventory();
    root.querySelector(`[data-category="${category}"]`).focus({ preventScroll: true });
  });
  scope.on($('inventory'), 'click', (event) => {
    const mod = event.target.closest('[data-mod]');
    if (mod) {
      game.modifyWeapon(Number(mod.dataset.index), Number(mod.dataset.mod));
      onChange();
      return;
    }
    const button = event.target.closest('[data-action]');
    if (button) {
      const action = button.dataset.action;
      game.transact(tab, Number(button.dataset.index), action);
      onChange();
      if (tab === 'weapons' && ['equip', 'buy'].includes(action)) {
        $('camp-dialog').querySelector('.ui-panel__body').scrollTop = 0;
        root
          .querySelector('.item-card.equipped [data-action="upgrade"]')
          ?.focus({ preventScroll: true });
      }
    }
  });
  return {
    openCurrentCat: currentCat.open,
    render: renderInventory,
    renderFieldIcons,
    renderIntro,
    switchTab,
    reset,
    invalidateArt,
    dispose: ()=>{currentCat.dispose();scope.dispose();},
  };
}

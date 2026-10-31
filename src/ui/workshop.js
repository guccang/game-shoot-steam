import {equipmentQuest,equipmentQuestReason} from '../progression/equipment-quests.js';
import {equipmentQuestStatus} from './equipment-quests.js';
import {facilityOpen,workshopFacility} from '../config/town-restoration.js';
import {arrivalPistolPurchase} from '../config/ranger-arrival.js';
import {workshopCatalog} from '../progression/workshop-catalog.js';
import {WORKSHOP_FUNCTIONS,renderWorkshopFunctions} from './workshop/function-tabs.js';
import {vehicleTransferState,activateVehicleTransfer} from './vehicle-transfer.js';
import {challengeRankIcon} from '../rendering/challenge-rank.js';
import {createWorkshopMastery} from './workshop/mastery.js';
import {createWorkshopEquipmentInfo} from './workshop/equipment-info.js';
import { i18nText, i18nHtml } from "../i18n/index.js";
import { VEHICLE_WEAPONS, nativeVehicleWeapon } from '../config/vehicle-armaments.js';
import { renderWorkshopStats } from './workshop/stats.js';
import {vehicleTraits} from '../config/vehicle-traits.js';
import {createWeaponTrialPage} from './workshop/trial-scene.js';
import { bindWorkshopEntrypoints } from './workshop/entrypoints.js';
import { upgradeHint, economyUpgradeQuote } from '../config/economy.js';
import { createWorkshopCompletion } from './workshop/completion.js';
import { workshopResultChanges, formatWorkshopResult } from './workshop/results.js';
import { drawWorkshopReplacement, drawWorkshopPartComparison } from '../rendering/workshop-assembly.js';
import { equipmentParts, partLevel } from '../config/equipment-parts.js';
import { drawEquipmentPart, partBounds } from '../rendering/equipment-parts.js';
import { createWorkshopConstruction } from './workshop/construction.js';
// 沉浸式工坊只管理交互草稿；规则、报价、提交与试射由独立模块提供。
import { WORKSHOP_MARKUP } from './workshop/markup.js';
import { WEAPONS, WEAPON_DISPLAY_ORDER } from '../config/weapons.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';
import { WEAPON_MODS, masteryInfo, MOD_MASTERY_LEVEL } from '../config/weapon-mods.js';
import { workshopPart } from '../config/workshop-parts.js';
import { quoteWorkshop, previewWorkshop, workshopDraft, workshopUpgrade, applyPartPreview } from '../progression/workshop.js';
import { trackEquipment } from '../progression/equipment-goals.js';
import { drawWorkshopEquipment, workshopLayout } from '../rendering/workshop.js';
import { drawWorkshopPart } from '../rendering/workshop-parts.js';
import { resourceButton } from '../rendering/resource-icons.js';
import { createEventScope } from '../platform/events.js';
import {recordMainlineTrial} from '../core/mainline-manager.js';
import {mainlinePurchaseReason} from '../config/mainline-gates.js';

// 所有入口共用一个弹窗；外部注入持久化事务和隔离靶场，界面不依赖 Game 类型。
export function createWorkshop({ game, root, dialogs, commit, createTrial, onChange, onEquipmentStory }) {
  const host = root.defaultView, scope = createEventScope();
  const dialog = root.createElement('dialog');
  dialog.id = 'workshop-dialog'; dialog.className = 'workshop-dialog';
  dialog.setAttribute('aria-labelledby', 'workshop-title'); dialog.innerHTML = WORKSHOP_MARKUP;
  root.body.append(dialog);
  const $ = id => root.getElementById(id);
  const mastery=createWorkshopMastery({root,dialogs,scope});
  let kind = 'weapons', index = game.progress.weapon, draft = null, selectedPart = null;
  let before = false, opener = null;
  let functionPage = 'upgrade', mountPage=0; // 挂载目录分页只记录界面位置。
  let comparison = null; // 仅内存保留本次施工前快照，完成后仍可同角度比较。
  let payment = null, tray = 'components', editingTurret = null, selectedUpgrade = null, assemblyFrame = 0;
  const equipmentInfo=createWorkshopEquipmentInfo({root,dialogs,scope,progress:()=>game.progress,selection:()=>({kind,index,turret:editingTurret}),onLegendary:()=>game.openLegendaryWorkshop?.()});
  const construction = createWorkshopConstruction({root,scope,canStart:()=>!assemblyFrame && !!draft && !before && quoteWorkshop(game.progress,draft,!!game.realm).ok,complete:()=>submit(draft),reduced:()=>reduced.matches});
  const reduced = host.matchMedia('(prefers-reduced-motion: reduce)');
  const completion=createWorkshopCompletion({root,reduced:()=>reduced.matches});
  const trial=createWeaponTrialPage({root,dialog,dialogs,createTrial,reduced:()=>reduced.matches,onHit:selection=>{recordMainlineTrial(game,selection);game.onEvent('mainline-trial');onChange();}});
  // 展示画布匹配工作台比例，维持双层像素预算，避免放大后留黑边或热点偏移。
  function resizeStage() {
    if (!dialog.open) return;
    const stage = $('ws-stage'), bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = bounds.width / bounds.height;
    const width = Math.max(1, Math.floor(Math.sqrt(264000 * ratio)));
    const height = Math.max(1, Math.floor(264000 / width));
    if (stage.width === width && stage.height === height) return;
    for (const canvas of [stage, $('ws-construction')]) { canvas.width = width; canvas.height = height; }
    paint();
  }
  const stageObserver = new host.ResizeObserver(resizeStage);
  stageObserver.observe($('ws-stage'));
  // 原配置作为比较基准；已拥有武器不会因为浏览而获得属性。
  function preview(choice) { return previewWorkshop(game.progress, kind, index, choice); }
  // 当前草稿与购买、升级共用同一报价栏。
  function currentPlan() {
    if (draft) return draft;
    if (payment) return payment;
    const owned = (kind === 'weapons' ? game.progress.weapons : game.progress.vehicleHulls)[index];
    return { kind, index, action: owned || functionPage!=='buy' ? 'inspect' : 'buy' };
  }
  // 点击时只读取候选报价，不把选择变成可提交草稿。
  function quotePlan() {
    if (draft || payment) return currentPlan();
    const target=partTarget();
    if(selectedUpgrade) return workshopUpgrade(game.progress,target.kind,target.index,selectedUpgrade,kind==='vehicle'?index:null);
    if(tray==='kits' && selectedPart!==null) return workshopDraft(game.progress,kind,index,selectedPart);
    return currentPlan();
  }
  // 用途只使用短说明；套件与炮塔沿用正式目录文案。
  function describePlan(plan) {
    if(plan.action==='part') {
      const spec=equipmentParts(plan.kind,plan.index,game.progress).find(p=>p.key===plan.part);
      const purposes={damage:i18nText("ui.workshop.8c0f404da6"),rate:i18nText("ui.workshop.c688841728"),capacity:i18nText("ui.workshop.b13fe6eb39"),reload:i18nText("ui.workshop.754ee4652f"),range:i18nText("ui.workshop.c93492d4a9"),accuracy:i18nText("ui.workshop.cb5b2e6e19"),armor:i18nText("ui.workshop.d501c505ba"),engine:i18nText("ui.workshop.c3c0f4b9a9"),coordination:i18nText("ui.workshop.e69e3c1155")};
      if(plan.kind==='weapons'&&WEAPONS[plan.index].attackKind==='defense')return `${spec.name} · ${plan.part==='damage'?'提升护盾容量':'提升每秒恢复量'}`;
      return `${spec.name} · ${purposes[plan.part]}`;
    }
    if(plan.action==='modify') return plan.choice ? `${WEAPON_MODS[index][plan.choice-1].name} · ${WEAPON_MODS[index][plan.choice-1].description}` : i18nText("ui.workshop.896126dec8");
    if(plan.action==='mount') return i18nText("ui.workshop.e84b511a98", { p0: (VEHICLE_WEAPONS[plan.choice].name), p1: (VEHICLE_WEAPONS[plan.choice].description) });
    if(plan.action==='buy'&&plan.kind==='vehicle'&&COLLECTED_VEHICLES[plan.index].rewardOnly)return i18nText("ui.workshop.2bd6a13c11");
    if(plan.action==='buy') return plan.kind==='vehicle'?i18nText("ui.workshop.6496a315a6", { p0: COLLECTED_VEHICLES[plan.index].name }):i18nText("ui.workshop.215711a764", { p0: WEAPONS[plan.index].name });
    return i18nText("ui.workshop.66b0170615");
  }
  // 试装副本先挂载编辑中的炮塔，再应用单个部件；正式目标始终不切换。
  function snapshot(staged = false) {
    const choice = kind === 'vehicle' ? editingTurret ?? payment?.index ?? (staged ? draft?.choice : undefined) : staged && draft?.action === 'modify' ? draft.choice : undefined;
    let result = comparison&&!staged?previewWorkshop(comparison.progress,kind,index,choice):preview(choice);
    if(staged && draft?.action === 'part') {
      applyPartPreview(result.progress,draft);
      result = previewWorkshop(result.progress,kind,index,choice);
    }
    return result;
  }
  // 部件归属明确区分车体、独立炮塔与手持武器。
  function partTarget() { return { kind: editingTurret === null ? kind : 'turret', index: editingTurret ?? index }; }
  // 当前所选部件决定连接点、图形和施工工具。
  function selectedSpec() { const target=partTarget();return equipmentParts(target.kind,target.index,game.progress).find(p=>p.key === (selectedUpgrade || draft?.part)); }
  // 释放试射帧循环；正式战场仍由外层弹窗保持暂停。
  function stopTrial() {
    completion.cancel();
    trial.stop();
  }
  // 选中对象后重建货架及托盘，不切换正式出战对象。
  function choose(nextKind, nextIndex, nextPage=functionPage) {
    if(nextKind==='vehicle'&&nextPage==='modify')nextPage='upgrade';
    const items=workshopCatalog(game.progress,nextKind,nextPage),equipped=nextKind==='weapons'?game.progress.weapon:game.progress.vehicleIndex;
    nextIndex=items.includes(nextIndex)?nextIndex:items.includes(equipped)?equipped:items[0]??null;
    functionPage=nextPage;mountPage=0;
    comparison=null;
    dialog.dataset.workshopKind=nextKind;
    $('workshop-title').textContent=(nextKind==='vehicle'?i18nText('workshop.vehicle.title'):i18nText('workshop.weapons.title'));
    stopTrial(); construction.cancel(); host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0; editingTurret=null; selectedUpgrade=null; tray='components'; kind = nextKind; index = nextIndex; draft = null; selectedPart = null;
    before = false; payment = null;
    // 两种工坊共用底部确认区，不要求拖动施工工具。
    dialog.querySelector('.ws-footer').append($('ws-construction-tools'));
    if(functionPage==='modify')tray='kits';
    $('ws-feedback').textContent = ''; render();
    // 购买列表保留浏览位置，避免点选后将整行突然推到顶部。
    const selected=$('ws-shelf').querySelector('[aria-pressed="true"]');
    if(selected)$('ws-shelf').scrollTop=selected.offsetTop-$('ws-shelf').offsetTop;
  }
  // 成本颜色和文字共同表达不足，战绩只校验而不显示扣除。
  function renderQuote() {
    dialog.dataset.partDraft=String(draft?.action==='part');
    dialog.dataset.holdDraft=String(!!draft);
    dialog.dataset.draft=String(!!draft);
    $('ws-change-part').hidden=!draft&&!comparison;
    $('ws-change-part').textContent=comparison?'继续升级':functionPage==='modify'?'更换方案':'更换部件';
    const plan = quotePlan(), quote = plan.action==='inspect' ? {ok:false,rows:[],reason:''} : quoteWorkshop(game.progress, plan, !!game.realm);
    $('ws-purpose').textContent=describePlan(plan);
    // 结算区仅显示当前操作与效果，获取途径和故事统一在名称旁的问号中查看。
    $('ws-cost-title').textContent = i18nText("ui.workshop.085eead04d", { p0: (['part','upgrade'].includes(plan.action) ? i18nText("ui.workshop.37ee956958") : ['modify','mount'].includes(plan.action) ? i18nText("ui.workshop.adba1fb4a6") : i18nText("ui.workshop.1e7f090b19")) });
    const resources=quote.rows.filter(row=>row.key!=='bosses'),challenge=quote.rows.find(row=>row.key==='bosses');
    dialog.dataset.hasQuote=String(resources.length>0);
    dialog.dataset.checkout=String(!comparison&&(!!draft||plan.action==='buy'||resources.length>0));
    $('ws-resources').style.setProperty('--ws-resource-count',String(Math.max(1,resources.length)));
    $('ws-equip').hidden=!(kind==='weapons'?game.progress.weapons:game.progress.vehicleHulls)[index];

    // 原价直接来自正式报价；拥有数量与缺口仍按实际折后扣费显示。
    const upgradeQuote=['part','upgrade'].includes(plan.action)?economyUpgradeQuote(game.progress,plan.kind,plan.index,partLevel(game.progress,plan.kind,plan.index,plan.part||'damage'),plan.part):null;
    const discounted=upgradeQuote?.discount<1;
    $('ws-resources').closest('.ws-footer').dataset.discounted=String(discounted);
    if(discounted)$('ws-cost-title').textContent='升级所需 ·';
    $('ws-resources').innerHTML=resources.length?resources.map(row=>`<div class="ws-resource ${row.missing?'short':''}" title="拥有 ${row.have}，需要 ${row.need}${discounted?'，已享升级优惠':''}">${resourceButton(row.key)}<span><b>${row.need}</b>${row.missing?`<small>缺 ${row.missing}</small>`:''}</span></div>`).join(''):`<span class="ws-free">${i18nHtml("ui.workshop.34c4a3aa45")}</span>`;
    $('ws-confirm').hidden = true;
    $('ws-confirm').disabled = !draft || !quote.ok;
    construction.configure(draft ? draft.action==='part' ? selectedSpec() : {tool:'wrench'} : null, quote.ok && !before,true, draft?.action==='part'?'升级':draft?.action==='mount'?'挂载':'改装');
    if(['part','upgrade'].includes(plan.action)) $('ws-cost-title').textContent+=' '+upgradeHint(game.progress,plan.kind,plan.index,partLevel(game.progress,plan.kind,plan.index,plan.part||'damage'),plan.part);
    if(plan.action==='inspect') $('ws-cost-title').textContent=i18nText("ui.workshop.5ff8b327f0");
    $('ws-confirm').textContent = draft && quote.purchase ? i18nText("ui.workshop.f753a207c3") : i18nText("ui.workshop.markup.40e7d0db20");
    const owned = (kind === 'weapons' ? game.progress.weapons : game.progress.vehicleHulls)[index];
    $('ws-purchase').hidden = !!owned;
    $('ws-purchase').textContent = !owned&&kind==='vehicle'&&COLLECTED_VEHICLES[index].rewardOnly?i18nText("ui.panels.vehicles.18fc7d0bec"):owned ? i18nText("balance.app.94996ca622") : kind === 'weapons' ? i18nText("ui.inventory.99be99bf93") : i18nText("ui.panels.vehicles.6a0b8701a9");
    $('ws-purchase').disabled = !!draft || !!payment || plan.action!=='buy' || !quote.ok;
    const quest=equipmentQuest(kind,index),questState=quest&&equipmentQuestStatus(game.progress,quest);
    $('ws-story-condition').hidden=plan.action!=='buy'||!quest;
    $('ws-story-condition').textContent=quest?`购买前提：《${quest.title}》\n${questState.ready?'已完成':questState.text} · 点击查看`:'';
    $('ws-state').textContent = kind === 'weapons' ? '手持武器' : editingTurret===null?(COLLECTED_VEHICLES[index].unarmed?COLLECTED_VEHICLES[index].description:index===4?i18nText("ui.workshop.105f8407a1"):nativeVehicleWeapon(index)?i18nText("ui.workshop.8a81f5ed02"):i18nText("ui.workshop.3790a80e4f")):i18nText("ui.workshop.5b4d6940d8", { p0: (COLLECTED_VEHICLES[index].shortName) });
    mastery.render(game.progress,{kind,index,turret:editingTurret??(tray==='kits'?selectedPart:null)??game.progress.vehicleLoadouts[index]});
    $('ws-feedback').textContent = !quote.ok ? quote.reason : draft ? i18nText("ui.workshop.932590b9dc") : plan.action==='inspect' ? '' : i18nText("ui.workshop.326cac52be");
    if(plan.action==='buy'&&equipmentQuestReason(game.progress,kind,index))$('ws-feedback').textContent='故事未完成';
    if(challenge?.missing&&quote.reason?.includes('挑战等级')){$('ws-feedback').textContent=`挑战 ${challenge.need} 阶未达`;$('ws-feedback').insertAdjacentHTML('afterbegin',challengeRankIcon(challenge.need));}
    $('ws-track').hidden = (!quote.rows.some(r => r.missing)&&!mainlinePurchaseReason(game.progress,kind,index)) || ['modify','upgrade','part'].includes(plan.action);
    if(functionPage==='buy'&&owned){$('ws-purpose').textContent='已拥有这件装备';$('ws-cost-title').textContent='可直接装备，或前往升级部件';$('ws-resources').textContent='';}
    renderWorkshopFunctions(root,{page:functionPage,kind,index,progress:game.progress,owned:!!owned,unarmed:kind==='vehicle'&&COLLECTED_VEHICLES[index].unarmed});
    $('ws-socket').tabIndex=-1;
    $('ws-socket').setAttribute('aria-hidden','true');
    {
      if(draft&&quote.ok)$('ws-feedback').textContent='';
      $('ws-socket').hidden=!['upgrade','modify'].includes(functionPage)||(selectedUpgrade===null&&selectedPart===null&&!draft);
      if(!draft&&(selectedUpgrade!==null||selectedPart!==null)&&quote.ok)$('ws-feedback').textContent='点选部件即可试装';
    }
    renderUpgradePreview();
    return quote;
  }
  // 属性预览使用正式试装副本计算，未完成长按前不会写入存档。
  function renderUpgradePreview() {
    const node=$('ws-upgrade-preview');
    node.hidden=draft?.action!=='part';
    if(node.hidden)return;
    const changes=workshopResultChanges(game.progress,snapshot(true).progress,draft,game.maxHp());
    node.style.setProperty('--ws-change-count',String(Math.max(1,changes.length)));
    node.innerHTML=changes.map(v=>`<div><small>${v.label}</small><b>${formatWorkshopResult(v.old)} <i>→</i> <strong>${formatWorkshopResult(v.value)}</strong></b></div>`).join('');
  }
  // 把当前与试装快照交给属性模块，展示层不读取可变草稿。
  function renderStats() {
    const showCurrent = kind === 'vehicle' && ['upgrade','unlock'].includes(functionPage);
    // 当前属性始终读取已保存车体，试装变化继续由底部升级预览展示。
    const current = showCurrent ? previewWorkshop(game.progress,kind,index) : snapshot(false);
    renderWorkshopStats({root,current,after:showCurrent?current:snapshot(true),kind,index,maxHp:game.maxHp(),draft:showCurrent?null:draft,comparison:showCurrent?null:comparison,summaryOnly:!showCurrent});
    if(showCurrent)$('ws-stats-title').textContent='当前战车属性';
    $('ws-vehicle-traits').hidden=!showCurrent;
    $('ws-trait-list').replaceChildren();
    if(showCurrent){
      const traits=vehicleTraits(index);
      for(const text of traits.length?traits:['暂无特殊特性']){
        const item=root.createElement('li');item.textContent=text;$('ws-trait-list').append(item);
      }
    }
  }
  // 完成摘要只展示本次实际变化，数值由正式装备属性计算读取。
  function renderResult() {
    const visible=!!comparison&&!draft;
    $('ws-result').hidden=!visible;
    if(!visible)return;
    const plan=comparison.plan,spec=equipmentParts(plan.kind,plan.index,game.progress).find(p=>p.key===plan.part);
    $('ws-result-name').textContent=`✓ ${spec.name}`;
    $('ws-result-level').textContent=i18nText("common.levelUpgrade", { p0: plan.original, p1: plan.original+1 });
    const changes=workshopResultChanges(comparison.progress,game.progress,plan,game.maxHp());
    $('ws-result-fields').dataset.count=String(changes.length);
    $('ws-result-fields').innerHTML=changes.map(v=>`<div><small>${v.label}</small><b><span>${formatWorkshopResult(v.old)}</span><i>→</i><strong>${formatWorkshopResult(v.value)}</strong><em>${v.value>v.old?'↑':'↓'}</em></b></div>`).join('');
  }
  // 局部结构并排对比；点击任一侧会用同角度显示整件装备。
  function renderComparison() {
    renderResult();
    const plan=draft?.action==='part'?draft:comparison?.plan;
    $('ws-part-compare').hidden=!plan;$('ws-bench').dataset.partCompare=String(!!plan);
    if(!plan)return;
    const spec=equipmentParts(plan.kind,plan.index,game.progress).find(p=>p.key===plan.part);
    for(const [id,isBefore] of [['ws-part-before',true],['ws-part-after',false]]) {
      const button=$(id),level=Math.min(spec.max,plan.original+(isBefore?0:1));
      drawWorkshopPartComparison(button.querySelector('canvas').getContext('2d'),plan.index,spec,level);
      button.querySelector('span').innerHTML=`<b>${isBefore?i18nText("ui.workshop.markup.59b27f680b"):comparison?i18nText("ui.workshop.8a6dba41f9"):i18nText("ui.workshop.markup.3d7e0e5966")}</b><small>${i18nHtml("common.level", { p0: level })}</small>`;
      button.setAttribute('aria-pressed',String(before===isBefore));
      button.setAttribute('aria-label',i18nText("ui.workshop.433c42c7e3", { p0: (spec.name), p1: (isBefore?i18nText("ui.workshop.markup.59b27f680b"):comparison?i18nText("ui.workshop.8a6dba41f9"):i18nText("ui.workshop.markup.3d7e0e5966")), p2: (level) }));
    }
  }
  // 同一绘制器绘制原件与试装，查看当前不丢失草稿。
  function paint() {
    if(index===null)return;
    $('ws-bench').dataset.replacing=String(assemblyFrame!==0);
    const current = snapshot(false), after = snapshot(!before);
    try {
    drawWorkshopEquipment($('ws-stage').getContext('2d'), after.progress, kind, index);
    drawWorkshopEquipment($('ws-original').getContext('2d'), current.progress, kind, index);
    } catch(error) { const c=$('ws-stage').getContext('2d'); if(c.reset)c.reset();else c.canvas.width=c.canvas.width;c.clearRect(0,0,c.canvas.width,c.canvas.height); $('ws-feedback').textContent=i18nText("ui.workshop.bb21cd9829"); console.error(error); }
    $('ws-stage-label').textContent = comparison ? (before?i18nText("ui.workshop.markup.59b27f680b"):i18nText("ui.workshop.cd64a7cda7")) : draft ? (before?i18nText("ui.workshop.markup.59b27f680b"):i18nText("ui.workshop.e836dbfdb0")) : payment?.kind === 'turret' ? i18nText("ui.workshop.2cfb98f8d7") : i18nText("ui.workshop.markup.283a7f514f");
    renderComparison();
    $('ws-before').hidden = !draft;
    $('ws-before').querySelector('span').textContent = before ? i18nText("ui.workshop.577b1e50fd") : i18nText("ui.workshop.markup.93781bc574");
    $('ws-socket').classList.toggle('ready', selectedPart !== null || selectedUpgrade !== null);
    const part = kind === 'weapons' ? workshopPart(index, selectedPart || draft?.choice || 1) : null;
    const canvas = $('ws-stage'), layout = workshopLayout(canvas.width, canvas.height, kind, index);
    const controller = kind === 'weapons' && [12, 13].includes(index);
    const spec=selectedSpec();
    let x = kind === 'vehicle' || controller ? 0 : layout.shift + layout.gunScale * (part?.x||0);
    let y = kind === 'vehicle' ? 5 : controller ? 33 + (part?.y||0) : layout.gunScale * (part?.y||0);
    if(spec) { if(kind==='vehicle') { const scale=editingTurret===null?1:.75; const angle=editingTurret===null?0:-.18;x=(spec.x*Math.cos(angle)-spec.y*Math.sin(angle))*scale;y=(spec.x*Math.sin(angle)+spec.y*Math.cos(angle))*scale+(editingTurret===null?0:5); } else if(controller) {x=spec.y*.6*1.4;y=-4+(-21-spec.x*.6)*1.4;} else {x=layout.shift+layout.gunScale*spec.x;y=layout.gunScale*spec.y;} }
    $('ws-socket').style.left = (layout.x + x * layout.scale) / canvas.width * 100 + '%';
    $('ws-socket').style.top = (canvas.offsetTop + (layout.y + y * layout.scale) / canvas.height * canvas.clientHeight) / $('ws-bench').clientHeight * 100 + '%';
    // 已保存的新件才有完成描边；查看旧件、试射或拖动其他部件时不误标。
    const highlight=comparison&&!draft&&!before&&!trial.active()&&selectedUpgrade===comparison.plan.part;
    if(highlight&&spec) {
      const b=partBounds(spec),ratio=canvas.getBoundingClientRect().width/canvas.width;
      const scale=layout.scale*(kind==='vehicle'?(editingTurret===null?.72:.75):controller?.84:layout.gunScale)*ratio;
      completion.show({plan:comparison.plan,tool:spec.tool,paired:comparison.plan.kind==='vehicle'&&spec.paired,width:Math.max(38,b.width*scale+20),height:Math.max(34,b.height*scale+18)});
    } else completion.show(null);

  }
  // 货架与零件采用真实 Canvas 画像，不以图标字符代替装备。
  function render() {
    const order=workshopCatalog(game.progress,kind,functionPage);
    // 购买或外部奖励改变归属后重新选择合法货架项，清掉旧预览和报价。
    if(!order.includes(index)&&!(index===null&&!order.length)){choose(kind,index);return;}
    const empty=index===null;
    $('ws-empty-catalog').hidden=!empty;
    dialog.querySelector('.ws-center').hidden=empty;dialog.querySelector('.ws-footer').hidden=empty;
    dialog.querySelector('.ws-rack').hidden=empty;
    if(empty){
      dialog.dataset.guideKind=kind;dialog.dataset.guideIndex='';dialog.dataset.hasQuote='false';
      $('ws-shelf').replaceChildren();$('ws-components').replaceChildren();$('ws-parts').replaceChildren();
      $('ws-empty-title').textContent=functionPage==='buy'?'当前目录已全部拥有':'暂无已拥有的装备';
      $('ws-empty-text').textContent=functionPage==='buy'?'可前往升级、改装或成长页查看已有装备。':'先到购买页获取装备，再来升级或查看成长。';
      $('ws-empty-action').textContent=functionPage==='buy'?'前往升级':'前往购买';
      renderWorkshopFunctions(root,{page:functionPage,kind,index,progress:game.progress,owned:false,unarmed:false,empty:true});
      construction.configure(null,false);return;
    }
    // 对外标记当前真实装备，主线只高亮匹配的购买或试射按钮。
    dialog.dataset.guideKind=kind;dialog.dataset.guideIndex=index;
    const scroll = ['ws-shelf', 'ws-parts', 'ws-components'].map(id => ({ id, left: $(id).scrollLeft, top: $(id).scrollTop }));
    const p = game.progress, catalog = kind === 'weapons' ? WEAPONS : COLLECTED_VEHICLES;
    for (const button of dialog.querySelectorAll('[data-ws-mode]')) button.setAttribute('aria-pressed', String(button.dataset.wsMode === kind));
    $('ws-rack-title').textContent = kind === 'weapons' ? i18nText("ui.workshop.markup.68cbef9d6a") : i18nText("ui.workshop.cd16ff08b4");
    $('ws-name').textContent = editingTurret===null ? catalog[index].name : VEHICLE_WEAPONS[editingTurret].name;
    $('ws-info').setAttribute('aria-label',`查看${$('ws-name').textContent}的档案`);
    $('ws-back-body').hidden=true;
    $('ws-kits-tab').hidden=functionPage!=='upgrade'||kind!=='vehicle'||COLLECTED_VEHICLES[index].unarmed;
    $('ws-back-body').textContent=i18nText("ui.workshop.086d497593");
    $('ws-kits-tab').textContent='武器部件';
    const weaponTarget=p.vehicleLoadouts[index]??nativeVehicleWeapon(index)?.weaponIndex??null;
    $('ws-kits-tab').disabled=kind==='vehicle'&&weaponTarget===null;
    $('ws-native-turret').hidden=kind!=='vehicle'||functionPage!=='upgrade'||!nativeVehicleWeapon(index)||nativeVehicleWeapon(index).weaponIndex===weaponTarget;
    $('ws-native-turret').setAttribute('aria-pressed',String(editingTurret===nativeVehicleWeapon(index)?.weaponIndex));
    $('ws-components-tab').textContent=kind==='vehicle'?i18nText("balance.app.4d4acd9679"):i18nText("balance.app.a2345efc60");
    $('ws-components-tab').setAttribute('aria-pressed',String(tray==='components'&&editingTurret===null));
    $('ws-kits-tab').setAttribute('aria-pressed',String(kind==='vehicle'?editingTurret!==null&&editingTurret===weaponTarget:tray==='kits'));
    $('ws-components').hidden=tray!=='components';
    $('ws-parts').hidden=$('ws-parts-title').hidden=tray!=='kits';
    const target=partTarget();
    $('ws-components').innerHTML=equipmentParts(target.kind,target.index,game.progress).map(part=>{const level=partLevel(p,target.kind,target.index,part.key);return `<button data-ws-upgrade="${part.key}" ${level>=part.max?'disabled':''} aria-pressed="${selectedUpgrade===part.key}" aria-label="${part.name}，${level>=part.max?'已满级':`等级 ${level} 升至 ${level+1}，点击自动试装`}"><canvas width="120" height="76" aria-hidden="true"></canvas><b>${part.name}</b><small>${level===part.max?i18nText("progression.workshop.d6d8e1de4a"):level+' → '+(level+1)}</small></button>`;}).join('');
    for(const button of $('ws-components').children) {
      const part=equipmentParts(target.kind,target.index,game.progress).find(p=>p.key===button.dataset.wsUpgrade),c=button.querySelector('canvas').getContext('2d');
      const level=Math.min(part.max,partLevel(p,target.kind,target.index,part.key)+1);
      // 加特林机匣和弹鼓使用联合包围展示，避免提把或旧弹鼓被小卡片裁掉。
      if(part.growthBounds||target.index===2&&part.bounds)drawWorkshopPartComparison(c,target.index,part,level);
      else {c.save();c.translate(60,36);c.scale(2,2);drawEquipmentPart(c,target.index,part,level,true);c.restore();}
    }
    const levels = kind === 'weapons' ? p.weapons : p.vehicleHulls;
    const shownLevel=editingTurret===null?levels[index]:p.vehicleWeapons[editingTurret];
    $('ws-level').textContent = shownLevel ? i18nText("common.level", { p0: shownLevel }) : i18nText("ui.inventory.2f0baebfe7");
    // 武器与载具各页共用纯图标侧栏，完整名称和状态通过无障碍标签提供。
    $('ws-shelf').innerHTML = order.map(i =>
      `<button type="button" data-ws-item="${i}" aria-pressed="${i === index}" aria-label="${catalog[i].name}，${levels[i] ? i18nHtml("common.level", { p0: levels[i] }) : i18nText("ui.inventory.2f0baebfe7")}"><canvas width="150" height="100" aria-hidden="true"></canvas></button>`).join('');
    for (const button of $('ws-shelf').children) {
      const i = Number(button.dataset.wsItem);
      drawWorkshopEquipment(button.querySelector('canvas').getContext('2d'), previewWorkshop(p, kind, i).progress, kind, i);
    }
    // 套件数量由装备目录决定，纯防具仅提供部件升级。
    const choices = kind === 'weapons' ? (WEAPON_MODS[index]||[]).map((_,i)=>i+1) : [];
    $('ws-parts-title').textContent = kind === 'weapons' ? i18nText("ui.workshop.0b08dcea12") : i18nText("ui.workshop.c695fa585d");
    const pages=Math.max(1,Math.ceil(choices.length/4));mountPage=Math.min(mountPage,pages-1);
    $('ws-mount-pages').hidden=kind!=='vehicle'||tray!=='kits'||choices.length<=4;
    $('ws-mount-page').textContent=`${mountPage+1} / ${pages}`;
    $('ws-mount-prev').disabled=mountPage===0;$('ws-mount-next').disabled=mountPage===pages-1;
    const shownChoices=kind==='vehicle'?choices.slice(mountPage*4,mountPage*4+4):choices;
    $('ws-parts').innerHTML = shownChoices.map(choice => {
      const name = kind === 'weapons' ? WEAPON_MODS[index][choice - 1].name : VEHICLE_WEAPONS[choice].name;
      const installed = (kind === 'weapons' ? p.mods[index] : p.vehicleLoadouts[index]) === choice;
      return `<button data-ws-part="${choice}" aria-pressed="${selectedPart === choice}" aria-label="${name}，点击试装，长按确认"><canvas width="150" height="90" aria-hidden="true"></canvas><b>${name}</b><small>${installed ? i18nText("ui.panels.vehicles.a8b6c39dca") : kind === 'weapons' ? masteryInfo(p,index).level<MOD_MASTERY_LEVEL ? `熟练度 ${MOD_MASTERY_LEVEL} 级解锁 · 可试装` : i18nText("ui.workshop.08b161169f") : p.vehicleWeapons[choice] ? i18nText("ui.workshop.06c13d98da") : i18nText("ui.workshop.6b0b0ff114")}</small></button>`;
    }).join('');
    for (const button of $('ws-parts').children) {
      const choice = Number(button.dataset.wsPart), c = button.querySelector('canvas').getContext('2d');
      if (kind === 'weapons') {
        c.save(); c.translate(75, 48); c.scale(2.5, 2.5); drawWorkshopPart(c, workshopPart(index, choice), true); c.restore();
      } else drawWorkshopEquipment(c, previewWorkshop(p, 'vehicle', index, choice).progress, 'turret', choice);
    }
    $('ws-reset').hidden = kind !== 'weapons' || (!p.mods[index] && draft?.action !== 'modify');
    $('ws-funnel').hidden = !(kind==='weapons' && index===12 && p.weapons[12] || kind==='vehicle' && (editingTurret??p.vehicleLoadouts[index])===12 && p.vehicleWeapons[12]);
    $('ws-equip').textContent = kind === 'weapons' ? p.weapon === index ? i18nText("app.game-events.a68821c619") : i18nText("ui.inventory.36ab55267a") : p.vehicleIndex === index ? game.vehicle.active ? i18nText("ui.workshop.ed4d6094fa") : i18nText("ui.workshop.5001cd2d43") : i18nText("ui.workshop.c24ce3704f");
    $('ws-equip').disabled = !!draft || !levels[index] || (kind === 'weapons' && p.weapon === index);
    if(kind==='vehicle'&&index===4&&game.fireGarageParked){$('ws-equip').textContent=p.vehicleIndex===4?i18nText("ui.panels.vehicles.051b37c3fa"):i18nText("ui.panels.vehicles.a1a48bf3e2");$('ws-equip').disabled=!!draft||p.vehicleIndex===4;}
    $('ws-vehicle-parking').hidden=kind!=='vehicle';
    if(kind==='vehicle'){
      const transfer=vehicleTransferState(game,index);$('ws-equip').textContent=transfer.label;
      $('ws-equip').disabled=!!draft||!levels[index];
      $('ws-vehicle-parking').textContent=functionPage==='buy'?'购买后送至北停车场，前往换乘。':transfer.description+(index===5?' 骑乘特性：弹夹容量 +30%。':'');
    }
    $('ws-test').disabled = kind === 'vehicle' && !COLLECTED_VEHICLES[index].unarmed && !snapshot(true).weapon;
    $('ws-funnel').disabled = !!draft;
    $('ws-mechanical').hidden = !(kind==='weapons' && index===15 && p.weapons[15] || kind==='vehicle' && (editingTurret??p.vehicleLoadouts[index])===15 && p.vehicleWeapons[15]);
    $('ws-mechanical').disabled = !!draft || !!game.realm;
    $('ws-spider').hidden=!(kind==='weapons'&&index===16&&p.weapons[16]||kind==='vehicle'&&(editingTurret??p.vehicleLoadouts[index])===16&&p.vehicleWeapons[16]);
    $('ws-spider').disabled=!!draft||!!game.realm;$('ws-spider').dataset.spiderKind=kind==='vehicle'?'turret':'weapons';
    $('ws-part-info').textContent = editingTurret!==null ? i18nText("ui.panels.vehicles.c44fc70b85", { p0: (catalog[index].name) }) : kind === 'weapons' ? tray==='components' ? i18nText("ui.workshop.b30d706f06") : i18nText("ui.workshop.11ce0b2034") : nativeVehicleWeapon(index) ? i18nText("ui.workshop.d093c753d0", { p0: (nativeVehicleWeapon(index).name) }) : COLLECTED_VEHICLES[index].unarmed?COLLECTED_VEHICLES[index].description:index===4?i18nText("ui.workshop.06453112f3"):i18nText("ui.panels.vehicles.0fdc96045e");
    $('ws-turret-buy').hidden = kind !== 'vehicle' || selectedPart === null || !!p.vehicleWeapons[selectedPart];
    $('ws-turret-upgrade').hidden = kind !== 'vehicle' || selectedPart === null || !p.vehicleWeapons[selectedPart] || !!draft;
    if(tray==='components') $('ws-turret-buy').hidden=$('ws-turret-upgrade').hidden=true;
    $('ws-turret-buy').disabled = $('ws-turret-upgrade').disabled = !!draft;
    if(functionPage==='upgrade'&&kind==='vehicle'&&editingTurret===null)$('ws-part-info').textContent='升级车体装甲与动力';
    renderStats(); renderQuote(); paint();
    for (const item of scroll) { $(item.id).scrollLeft = item.left; $(item.id).scrollTop = item.top; }
  }
  // 原样放回不形成草稿，也不产生费用。
  function place(choice) {
    comparison=null;
    stopTrial(); construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0; selectedUpgrade=null; payment = null; before = false;
    const original = kind === 'weapons' ? game.progress.mods[index] : game.progress.vehicleLoadouts[index];
    draft = choice === original ? null : workshopDraft(game.progress, kind, index, choice);
    selectedPart = choice; $('ws-feedback').textContent = draft ? i18nText("ui.workshop.932590b9dc") : i18nText("ui.workshop.markup.283a7f514f"); render();
  }
  // 点选装备部件后自动播放替换预览，长按完成才执行实际升级。
  function placeUpgrade(key) {
    comparison=null;
    stopTrial();construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0;
    selectedPart=null;selectedUpgrade=key;payment=null;before=false;
    const target=partTarget(), specLimit=equipmentParts(target.kind,target.index,game.progress).find(p=>p.key===key);
    if(!specLimit||partLevel(game.progress,target.kind,target.index,key)>=specLimit.max){draft=null;render();$('ws-feedback').textContent=i18nText("progression.workshop.76b8c8d208");return;}
    draft=workshopUpgrade(game.progress,target.kind,target.index,key,kind==='vehicle'?index:null);
    render();
    $('ws-change-part').focus({preventScroll:true});
    if(reduced.matches)return;
    const start=host.performance.now(), spec=selectedSpec(), c=$('ws-construction').getContext('2d');
    // 装卸动画仅驱动独立部件，整体装备和握持点保持静止。
    function animate(now) {
      $('ws-bench').dataset.replacing='true';
      const t=Math.min(1,(now-start)/1100),r=$('ws-socket').getBoundingClientRect(),b=$('ws-construction').getBoundingClientRect();
      drawWorkshopEquipment($('ws-stage').getContext('2d'),snapshot(t>=.5).progress,kind,index,0,reduced.matches,{kind:target.kind,part:key});
      const layout=workshopLayout(c.canvas.width,c.canvas.height,kind,index), controller=kind==='weapons'&&[12,13].includes(index);
      const scale=layout.scale*(kind==='vehicle'?(editingTurret === null ? .72 : .75):controller ? .84 : layout.gunScale)*(spec.scale||1);
      drawWorkshopReplacement(c,{index:target.index,spec,level:draft.original,
        x:(r.left+r.width/2-b.left)*c.canvas.width/b.width,y:(r.top+r.height/2-b.top)*c.canvas.height/b.height,
        scale,angle:controller?-Math.PI/2:editingTurret!==null?-.18:0,pixels:c.canvas.width/b.width,mirrorX:target.kind==='vehicle'&&spec.paired?layout.x-spec.x*layout.scale:null},t);
      $('ws-stage-label').textContent=t<.35?i18nText("ui.workshop.7df390591a"):t<.5?i18nText("ui.workshop.d2f70e2dc7"):i18nText("ui.workshop.4fdf933bf4");
      if(t<1)assemblyFrame=host.requestAnimationFrame(animate);else {assemblyFrame=0;c.clearRect(0,0,c.canvas.width,c.canvas.height);paint();renderQuote();}
    }
    assemblyFrame=host.requestAnimationFrame(animate);
    renderQuote();
  }
  // 保存成功后才清除草稿；失败保留操作对象和费用供重试。
  function submit(plan) {
    if(!plan)return;
    stopTrial(); construction.cancel();
    const result = commit(plan);
    if (result.ok) {
      // 成功后原页续接新报价，长按进度已清零；满级和已安装方案仍由正式报价禁用。
      comparison=null;payment=null;before=false;
      draft=plan.action==='part'?workshopUpgrade(game.progress,plan.kind,plan.index,plan.part,plan.vehicleIndex)
        :['modify','mount'].includes(plan.action)?workshopDraft(game.progress,plan.kind,plan.index,plan.choice):null;
      onChange();
    }
    render(); $('ws-feedback').textContent = result.ok ? plan.kind==='vehicle'&&plan.action==='buy'?'购买完成，车辆已送到营地停车位。':i18nText("ui.workshop.f6b435718a") : result.reason;
    // 续接升级保持初始报价布局，不添加成功提示行；缺料或满级仍展示真实原因。
    if(result.ok&&draft){const quote=quoteWorkshop(game.progress,draft,!!game.realm);$('ws-feedback').textContent=quote.ok?'':quote.reason;}
  }
  // 外部入口可指定装备及炮塔目标；旧弹窗的暂停归属转交给综合工坊。
  function open(nextKind = 'weapons', nextIndex, turret) {
    if(!facilityOpen(game.progress,workshopFacility(nextKind))){game.requestFacility?.(workshopFacility(nextKind));return;}
    if (game.realm) return;
    // 修复后自由选择装备，过场期间仍由剧情接管操作。
    if(game.arrivalCinematic)return;
    opener = root.activeElement;
    // 首枪任务默认定位未购买的手枪，避免当前装备电锯把玩家带到升级页；明确指定装备的入口仍保留原目标。
    const targetIndex=nextIndex ?? (arrivalPistolPurchase(game.progress,nextKind,0,'buy')?0:nextKind === 'weapons' ? game.progress.weapon : game.progress.vehicleIndex);
    const owned=(nextKind==='weapons'?game.progress.weapons:game.progress.vehicleHulls)[targetIndex];
    choose(nextKind,targetIndex,owned?'upgrade':'buy');
    dialogs.open('workshop-dialog');
    resizeStage();
    for (const old of ['camp-dialog', 'vehicle-collection-dialog', 'equipment-goal-dialog']) if ($(old).open) {
      dialogs.transferResume(old, 'workshop-dialog'); dialogs.close(old);
    }
    dialog.querySelector('[data-ws-item="' + index + '"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (turret !== undefined && nativeVehicleWeapon(index)?.weaponIndex===turret) { tray='components'; editingTurret=turret; render(); }
    // 货架定位只保留货架自身滚动，打开工坊时中央标题与工作台始终从顶部展示。
    dialog.querySelector('.ws-layout').scrollTop = 0;
  }
  dialogs.register('workshop-dialog', { focusId: 'ws-close' });
  // 关闭直接丢弃未提交的试装，统一关闭回调负责停动画、清草稿并恢复游戏。
  scope.on(dialog, 'cancel', event => { event.preventDefault(); dialogs.close('workshop-dialog'); });
  scope.on(dialog, 'close', () => {
    comparison=null;
    stopTrial(); construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0; draft = null; payment = null;
    // 工坊入口在所有屏幕都可能已折叠，关闭后回到可见的菜单按钮。
    const focus = opener?.isConnected && opener.getClientRects().length ? opener : $('field-menu-toggle');
    focus?.focus({ preventScroll: true });
  });
  // 返回部件目录只取消免费试装，不提交费用。
  scope.on($('ws-change-part'),'click',()=>{const turret=editingTurret;choose(kind,index);if(turret!==null){editingTurret=turret;render();}});
  scope.on($('ws-close'), 'click', () => dialogs.close('workshop-dialog'));
  // 切换功能释放全部预览会话，不付款，也不弹出离开确认。
  function switchFunction(nextPage) {
    if(!WORKSHOP_FUNCTIONS.includes(nextPage)||nextPage===functionPage||kind==='vehicle'&&nextPage==='modify')return;
    choose(kind,index,nextPage);
    dialog.querySelector('.ws-layout').scrollTop=0;
    $('ws-function-'+nextPage).focus({preventScroll:true});
    resizeStage();
  }
  scope.on(dialog.querySelector('.ws-function-tabs'),'keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const pages=WORKSHOP_FUNCTIONS.filter(page=>kind!=='vehicle'||page!=='modify'),current=pages.indexOf(functionPage);
    const next=event.key==='Home'?0:event.key==='End'?pages.length-1:(current+(event.key==='ArrowRight'?1:pages.length-1))%pages.length;
    switchFunction(pages[next]);
  });
  scope.on($('ws-unlock-link'),'click',()=>switchFunction('unlock'));
  scope.on($('ws-go-upgrade'),'click',()=>switchFunction('upgrade'));
  // 查看故事只切换页面；明确点击追踪后才改变世界导航。
  scope.on($('ws-story-condition'),'click',()=>{const quest=equipmentQuest(kind,index);if(!quest)return;onEquipmentStory?.(quest.chapter);dialogs.transferResume('workshop-dialog','story-dialog');dialogs.close('workshop-dialog');});
  scope.on($('ws-go-buy'),'click',()=>switchFunction('buy'));
  scope.on($('ws-empty-action'),'click',()=>switchFunction(functionPage==='buy'?'upgrade':'buy'));
  scope.on(dialog, 'click', event => {
    const tab=event.target.closest('[data-ws-function]');if(tab)switchFunction(tab.dataset.wsFunction);
    const mode = event.target.closest('[data-ws-mode]'), item = event.target.closest('[data-ws-item]'), part = event.target.closest('[data-ws-part]');
    if (mode) choose(mode.dataset.wsMode, mode.dataset.wsMode === 'weapons' ? game.progress.weapon : game.progress.vehicleIndex);
    if (item) choose(kind, Number(item.dataset.wsItem));
    const upgrade=event.target.closest('[data-ws-upgrade]');if(upgrade&&!upgrade.disabled)placeUpgrade(upgrade.dataset.wsUpgrade);
    if(part&&!part.disabled)place(Number(part.dataset.wsPart));
  });
  scope.on($('ws-socket'), 'click', () => { if(construction.selected())return; if(selectedUpgrade!==null)placeUpgrade(selectedUpgrade);else if (selectedPart !== null) place(selectedPart); });
  // 施工中切换对照只停止动画，不提交；已提交后的旧外观仅用于查看。
  for(const [id,showBefore] of [['ws-part-before',true],['ws-part-after',false]])scope.on($(id),'click',()=>{
    before=showBefore;stopTrial();construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0;paint();renderQuote();
  });
  scope.on($('ws-before'), 'click', () => { before = !before; stopTrial(); construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0; paint();renderQuote(); });
  scope.on($('ws-reset'), 'click', () => place(0));
  scope.on($('ws-purchase'), 'click', () => { if (!draft) submit(currentPlan()); });
  scope.on($('ws-components-tab'),'click',()=>{comparison=null;before=false;stopTrial();construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0;draft=null;selectedPart=null;selectedUpgrade=null;editingTurret=null;tray='components';render();});
  scope.on($('ws-kits-tab'),'click',()=>{comparison=null;before=false;stopTrial();construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0;draft=null;selectedPart=null;selectedUpgrade=null;editingTurret=kind==='vehicle'?(game.progress.vehicleLoadouts[index]??nativeVehicleWeapon(index)?.weaponIndex??null):null;tray=kind==='vehicle'?'components':'kits';render();});
  // 分页只更换挂载目录，不付款或修改当前出战武器。
  for(const [id,delta] of [['ws-mount-prev',-1],['ws-mount-next',1]])scope.on($(id),'click',()=>{mountPage+=delta;render();});
  // 专属主炮入口无需先更换当前挂载，任务升级也不会擅自装备它。
  scope.on($('ws-native-turret'),'click',()=>{const native=nativeVehicleWeapon(index);if(!native)return;choose(kind,index,'upgrade');editingTurret=native.weaponIndex;render();});
  scope.on($('ws-back-body'),'click',()=>{choose(kind,index);tray='kits';editingTurret=null;render();});
  scope.on($('ws-turret-upgrade'),'click',()=>{functionPage='upgrade';comparison=null;before=false;if(draft||selectedPart===null)return;stopTrial();construction.cancel();editingTurret=selectedPart;selectedPart=null;selectedUpgrade=null;payment=null;tray='components';render();});
  for (const action of ['buy']) scope.on($('ws-turret-' + action), 'click', () => {
    if (draft || selectedPart === null) return;
    const plan = { kind: 'turret', index: selectedPart, action };
    if (payment?.kind === 'turret' && payment.index === selectedPart && payment.action === action) submit(plan);
    else { payment = plan; paint(); renderStats(); renderQuote(); $('ws-feedback').textContent = i18nText("ui.workshop.9a33df3fae") ; }
  });
  scope.on($('ws-track'), 'click', () => {
    const plan = quotePlan(), targetKind = plan.action === 'mount' ? 'turret' : plan.kind, targetIndex = plan.action === 'mount' ? plan.choice : plan.index;
    if (trackEquipment(game.progress, targetKind, targetIndex)) { game.onEvent('equipment-goal'); onChange(); $('ws-feedback').textContent = i18nText("ui.workshop.c8c35cf53e"); }
  });
  scope.on($('ws-equip'), 'click', () => {
    if (draft) return;
    if (kind === 'weapons') game.transact('weapons', index, 'equip');
    else if(activateVehicleTransfer(game,index))dialogs.close('workshop-dialog');
    onChange(); render();
  });
  scope.on(root.getElementById('mechanical-dialog'), 'close', () => { if(dialog.open){stopTrial();render();} });
  scope.on(root.getElementById('spider-dialog'), 'close', () => { if(dialog.open){stopTrial();render();} });
  scope.on($('ws-funnel'), 'click', () => { if (!draft) dialogs.open('funnel-dialog'); });
  scope.on($('ws-test'), 'click', () => {
    construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0;stopTrial();
    trial.start({progress:snapshot(!before).progress,kind,index,label:draft&&!before?i18nText("ui.workshop.4ace17cd8c"):i18nText("ui.workshop.1c19a179f0")});
  });
  // 演练返回重新启用免费试装的长按确认。
  scope.on($('weapon-trial-dialog'),'close',()=>{if(dialog.open)renderQuote();});
  bindWorkshopEntrypoints({root,scope,game,open});
  let guideQuoteCache=null;
  // 给指引提供只读快照；同一方案和钱包复用报价，避免每帧复制完整存档。
  function guideState(part){
    if(index===null)return {open:dialog.open,page:functionPage,kind,index:null,empty:true,draft:null,busy:false,dragging:false,trial:false,tool:construction.guideState(),affordable:false,reason:'当前页签没有武器'};
    const target=partTarget(),plan=part?workshopUpgrade(game.progress,target.kind,target.index,part,kind==='vehicle'?index:null):quotePlan();
    const p=game.progress,key=JSON.stringify([dialog.open,plan,p.coins,p.wood,p.materials,p.bosses,p.campLevel?.xp,p.mainline?.completed.length,p.weapons,p.vehicleHulls,p.vehicleWeapons,p.mastery,p.mods,!!game.realm]);
    if(!guideQuoteCache||guideQuoteCache.key!==key||guideQuoteCache.progress!==p)guideQuoteCache={key,progress:p,quote:plan.action==='inspect'||!dialog.open?{ok:true,reason:''}:quoteWorkshop(p,plan,!!game.realm)};
    const quote=guideQuoteCache.quote;
    return {open:dialog.open,page:functionPage,kind,index,turret:editingTurret,tray,part:selectedUpgrade,choice:selectedPart,
      draft:draft&&{...draft},completed:!!comparison,before,busy:!!assemblyFrame,dragging:false,trial:trial.active(),
      weaponTarget:game.progress.vehicleLoadouts[index]??nativeVehicleWeapon(index)?.weaponIndex??null,affordable:quote.ok,reason:quote.reason,tool:construction.guideState()};
  }
  // 自动预览正确的安装圈，不生成草稿、不扣费，不打断正在进行的长按或试装。
  function guidePreview(part){
    if(!dialog.open||index===null||functionPage!=='upgrade'||draft||assemblyFrame||trial.active()||before||selectedUpgrade===part)return;
    if(!equipmentParts(partTarget().kind,partTarget().index,game.progress).some(p=>p.key===part))return;
    comparison=null;selectedUpgrade=part;selectedPart=null;payment=null;
    for(const button of $('ws-components').children)button.setAttribute('aria-pressed',String(button.dataset.wsUpgrade===part));
    paint();renderQuote();
  }
  // 卸载时释放对话框和所有临时资源。
  function dispose() { stageObserver.disconnect(); trial.dispose(); construction.cancel();host.cancelAnimationFrame(assemblyFrame);assemblyFrame=0; equipmentInfo.dispose(); mastery.dispose(); scope.dispose(); dialog.remove(); }
  return { open, render, dispose, guideState, guidePreview };
}

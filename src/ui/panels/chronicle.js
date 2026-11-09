import { i18nHtml, i18nText } from "../../i18n/index.js";
// 设置内的游玩档案使用累计时长和天气占比，不读取设备日期伪造游戏年月。
import { createEventScope } from '../../platform/events.js';
import { chronicleSummary } from '../../world/play-chronicle.js';
import {STAT_RESOURCES,STAT_ACTIVITIES,validateGameStatistics} from '../../progression/player/game-statistics.js';
import {WEAPONS} from '../../config/weapons.js';
import {VEHICLE_ARMAMENTS} from '../../config/vehicle-armaments.js';
import {COLLECTED_VEHICLES} from '../../config/vehicles.js';
import {resourceIcon,resourceName} from '../../rendering/resource-icons.js';
// 累计数量不受钱包上限截断；整数缩写同时保留完整悬浮值和无障碍名称。
function numberMarkup(value){
  const label=value>=1e8?Math.floor(value/1e8)+'Y':value>=1e4?Math.floor(value/1e4)+'w':value>=1e3?Math.floor(value/1e3)+'k':String(value);
  return `<strong title="${value.toLocaleString('zh-CN')}" aria-label="${value.toLocaleString('zh-CN')}">${label}</strong>`;
}
// 把实际游玩时长转为适合设置阅读的小时与分钟，不影响主界面圆环。
function elapsedLabel(ms) { const seconds=Math.floor(ms/1000);return i18nText("ui.panels.chronicle.6b8acb7e2b", { p0: (Math.floor(seconds/3600)), p1: (Math.floor(seconds/60)%60), p2: (seconds%60) }); }
// 统计页打开时战斗由统一弹窗系统暂停，关闭后恢复原设置层。
export function createChroniclePanel({root,dialogs,record,game}) {
  const scope=createEventScope(),$=id=>root.getElementById(id);
  let equipmentTab='weapons';
  const stats=root.createElement('section');stats.id='chronicle-statistics';stats.setAttribute('aria-label','累计游玩统计');
  stats.innerHTML='<h3>战斗与采集</h3><div id="chronicle-combat" class="chronicle-cards"></div><section id="chronicle-equipment" aria-label="装备战绩"><h3>装备战绩</h3><div class="chronicle-equipment-switch" aria-label="装备类型"><button type="button" data-equipment-tab="weapons" aria-pressed="true">武器</button><button type="button" data-equipment-tab="vehicles" aria-pressed="false">载具</button></div><div id="chronicle-equipment-table"></div><p id="chronicle-equipment-legacy" class="environment-tip" hidden>旧档装备明细从本次更新后累计。</p></section><h3>累计获得资源</h3><div id="chronicle-income" class="chronicle-stat-grid"></div><h3>玩法参与次数</h3><div id="chronicle-plays" class="chronicle-stat-grid"></div><details class="chronicle-rules"><summary>？统计说明</summary><p>击败怪物包含领主，伐木按砍倒的树计算。试射靶标不计入。装备按致命攻击来源统计，召唤物归所属核心；车载攻击同时计入武器和车型，两组数据不相加。骑电动车的手持攻击也计入该车型，友军及无来源的碰撞只保留总数。资源只统计实际获得量，消费不扣减，调试赠送不计入。进入玩法记一次，退出或失败仍保留；读档续玩、清缴暂停后继续不重复计数。</p></details><p id="chronicle-legacy" class="environment-tip" hidden>旧档历史不完整，已恢复已有记录，新数据持续累计。</p>';
  $('chronicle-dialog').querySelector('.chronicle-cards').after(stats);
  // 所有插值来自受控枚举和数字，空记录显式展示零占比。
  function render() {
    const s=chronicleSummary(record);
    const totals=validateGameStatistics(game.progress.statistics);
    $('chronicle-combat').innerHTML=`<section><small>击败怪物</small>${numberMarkup(totals.kills)}</section><section><small>伐倒树木</small>${numberMarkup(totals.trees)}</section>`;
    $('chronicle-income').innerHTML=STAT_RESOURCES.map(key=>`<div class="chronicle-stat-row" data-stat-resource="${key}">${resourceIcon(key)}<span>${resourceName(key)}</span>${numberMarkup(totals.resources[key])}</div>`).join('');
    $('chronicle-plays').innerHTML=Object.entries(STAT_ACTIVITIES).map(([key,name])=>`<div class="chronicle-stat-row" data-stat-play="${key}"><span>${name}</span>${numberMarkup(totals.plays[key])}</div>`).join('');
    $('chronicle-legacy').hidden=!totals.partial;
    renderEquipment(totals.equipment);
    $('chronicle-calendar').textContent=i18nText("ui.panels.chronicle.9a83ffa8b1", { p0: (s.years), p1: (s.days) });
    $('chronicle-total-days').textContent='旧版游玩档案 · 新生活日期请查看邻里面板';
    $('chronicle-playtime').textContent=elapsedLabel(s.totalMs);
    $('chronicle-empty').hidden=s.totalMs>0;
    $('chronicle-weather').innerHTML=s.weather.map(w=>`<div class="chronicle-weather-row"><img src="/assets/environment/weather-${w.key}.svg" alt="" width="32" height="32"><div><b>${w.name}</b><small>${elapsedLabel(w.ms)}</small><meter min="0" max="100" value="${w.percent}" aria-label="${i18nHtml("ui.panels.chronicle.e78985cfc3", { p0: (w.name) })}">${w.percent.toFixed(1)}%</meter></div><strong>${w.percent.toFixed(1)}%</strong></div>`).join('');
  }
  // 已拥有或曾使用过的装备逐行展示，保留借用装备历史，不把未知旧记录分配给当前装备。
  function renderEquipment(equipment=validateGameStatistics(game.progress.statistics).equipment){
    const p=game.progress,vehicle=equipmentTab==='vehicles',records=equipment[equipmentTab];
    const catalog=vehicle?COLLECTED_VEHICLES.map((v,index)=>({...v,index,owned:p.vehicleHulls[index]>0})).filter(v=>!v.retired).sort((a,b)=>(a.index===5?-1:b.index===5?1:a.index-b.index)):
      [...WEAPONS.map((w,index)=>({...w,owned:p.weapons[index]>0||(index<17&&p.vehicleWeapons[index]>0)})),...VEHICLE_ARMAMENTS.map(w=>({...w,owned:p.vehicleWeapons[w.weaponIndex]>0}))];
    const rows=catalog.filter(w=>w.owned||records[w.id]?.kills||records[w.id]?.trees);
    $('chronicle-equipment-table').innerHTML=`<table class="chronicle-equipment-table" aria-label="${vehicle?'载具':'武器'}杀怪和伐木数量"><thead><tr><th scope="col">${vehicle?'载具':'武器'}</th><th scope="col">杀怪</th><th scope="col">伐木</th></tr></thead><tbody>${rows.map(w=>`<tr data-equipment-id="${w.id}"><th scope="row">${w.name}</th><td>${numberMarkup(records[w.id]?.kills||0)}</td><td>${numberMarkup(records[w.id]?.trees||0)}</td></tr>`).join('')}</tbody></table>${rows.length?'':`<p class="environment-tip">暂无${vehicle?'载具':'武器'}记录</p>`}`;
    for(const button of stats.querySelectorAll('[data-equipment-tab]'))button.setAttribute('aria-pressed',String(button.dataset.equipmentTab===equipmentTab));
    $('chronicle-equipment-legacy').hidden=!equipment.partial;
  }
  // 切换仅替换明细内容，不重新打开弹窗或改变滚动位置。
  for(const button of stats.querySelectorAll('[data-equipment-tab]'))scope.on(button,'click',()=>{equipmentTab=button.dataset.equipmentTab;renderEquipment();});
  dialogs.register('chronicle-dialog',{onOpen:render,focusId:'close-chronicle'});
  scope.on($('chronicle-button'),'click',()=>dialogs.open('chronicle-dialog'));
  for(const id of ['close-chronicle','chronicle-ok'])scope.on($(id),'click',()=>dialogs.close('chronicle-dialog'));
  // 销毁页面时一并释放新增节点，重新初始化不会叠加统计区。
  function dispose(){scope.dispose();stats.remove();}
  return {render,dispose};
}

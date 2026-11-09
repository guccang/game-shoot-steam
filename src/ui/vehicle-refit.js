import {vehicleRefitStats,VEHICLE_ZONES} from '../config/vehicle-refit.js';
import {vehicleBuildPrice} from '../core/vehicles/vehicle-build.js';
import {vehicleLoad} from '../progression/inventory/load-weight.js';
import {vehicleMaxHp,vehicleModel} from '../config/vehicles.js';
// 正式装配页的区域图与属性预览，不创建另一套车辆绘制器。
export function refitPreview(game,hull,zones){
 const p=structuredClone(game.progress);p.logistics.builds[hull].refit={...vehicleRefitStats(p,hull),zones};
 const next=vehicleLoad(game,hull,{progress:p,driver:true}),old=vehicleLoad(game,hull,{driver:true}),r=vehicleRefitStats(p,hull);
 const value=(a,b)=>`${Math.round(a)} → ${Math.round(b)}`;
 return `<p class="refit-plan-title">底盘舱区规划 · 比例示意</p><div class="refit-space" aria-label="底盘区域占比">${VEHICLE_ZONES.map(z=>`<span style="flex:${zones[z.id]};background:${z.color}" title="${z.name} ${zones[z.id]}%"></span>`).join('')}</div><div class="refit-legend">${VEHICLE_ZONES.map(z=>`<span><i style="background:${z.color}"></i>${z.name} ${zones[z.id]}%</span>`).join('')}</div><div class="refit-metrics"><span>额定载重<b>${value(old.capacity,next.capacity)} 千克</b></span><span>剩余牵引<b>${value(old.towCapacity,next.towCapacity)} 千克</b></span><span>车体耐久<b>${vehicleMaxHp({...p,vehicleIndex:hull})} HP</b></span><span>底盘总空间<b>${r.space} 单位</b></span></div><p>当前装载 ${Math.round(next.payload)} 千克 · 持有 ${game.progress.coins} 金币</p><p>${next.overloaded?'载荷不足，请增加引擎或储物区域后再应用。':'区域调整免费，应用后生效。增加一项占比会均摊扣减其他区域。'}</p>`;
}
// 部件图标只作界面示意，不替代正式车体或动作资产。
function componentIcon(id){const paths={vehicle:'M9 12h22v19H9z M13 6h14v6 M5 16v10 M35 16v10 M15 31v4 M25 31v4',engine:'M10 13h20v17H10z M16 7v6 M24 7v6 M5 19h5 M30 19h5 M15 22h10',armor:'M20 5L33 10v12L20 35 7 22V10z M14 19l5 5 9-11',chassis:'M8 7h24v28H8z M8 17h24 M8 26h24 M20 7v28'};return '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><path d="'+paths[id]+'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>';}
// 四个视图共享选中状态，功能区使用原生滑条与明确中文效果。
export function refitMarkup(game,hull,tab,zones,reason){
 const r=vehicleRefitStats(game.progress,hull),tabs=[['vehicle','载具'],['engine','引擎'],['armor','装甲'],['chassis','底盘']];
 const upgrade=(action,label,level)=>`<button class="ui-button ui-button--primary" data-refit-action="${action}" ${reason||level>=10||game.progress.coins<vehicleBuildPrice(game.progress,hull,action)?'disabled':''}>${level>=10?'已达上限':`${label} · ${vehicleBuildPrice(game.progress,hull,action)} 金币`}</button>`;
 return `<h3>${vehicleModel(hull).name}</h3><nav class="refit-tabs" aria-label="改造部件">${tabs.map(([id,name])=>`<button class="ui-button" data-refit-tab="${id}" aria-pressed="${tab===id}">${componentIcon(id)}<span>${name}</span></button>`).join('')}</nav><section class="ui-section"><div data-refit-preview>${refitPreview(game,hull,zones)}</div></section>${reason?`<p>${reason}</p>`:''}
 ${tab==='vehicle'?'<p>引擎提高运力，装甲增加耐久，底盘扩容提高区域能力上限。选择部件查看改造。</p>':''}
 ${tab==='engine'?`<section class="ui-section"><h3>引擎强化 · ${r.engineLevel} / 10</h3><p>每级增加原厂动力的10%，同时提升额定载重与牵引。已购买发动机可免费换装。</p>${upgrade('upgrade-engine','强化引擎',r.engineLevel)}</section>`:''}
 ${tab==='chassis'?`<section class="ui-section"><h3>底盘扩容 · ${r.chassisLevel} / 10</h3><p>每级增加20单位空间，当前${r.space}单位。各区至少5%，合计100%。区域强度 = 50% + 分配空间 × 2.5%。</p>${upgrade('upgrade-chassis','扩容底盘',r.chassisLevel)}</section><section class="ui-section">${VEHICLE_ZONES.map(z=>`<label class="refit-zone" style="--zone-color:${z.color}"><span>${z.name}<b data-zone-value="${z.id}">${zones[z.id]}%</b></span><input type="range" min="5" max="80" value="${zones[z.id]}" data-refit-zone="${z.id}" aria-label="${z.name}占比" ${reason?'disabled':''}><small>${z.effect} · <output data-zone-strength="${z.id}">${Math.round((.5+r.space*zones[z.id]/4000)*100)}%</output></small></label>`).join('')}<p>副武器区仅强化已装备的车载伙伴及外挂枪，不凭空获得武器。生活区影响战车驻营休息。</p><button class="ui-button ui-button--primary" data-refit-action="zones" ${reason?'disabled':''}>应用区域方案</button><button class="ui-button" data-refit-reset>还原已保存占比</button></section>`:''}`;
}

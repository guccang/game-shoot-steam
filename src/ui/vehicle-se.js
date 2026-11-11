import {seDeviceIcon} from './se-device-icon.js';
// SE 面板复用手机标准分区，工坊负责购买装配，随车页负责开关与驾驶控制。
import {VEHICLE_SE,seLevel,seShieldMax,seBuild,seMass} from '../config/vehicle-se.js';
import {vehicleBuildReason} from '../core/vehicles/vehicle-build.js';
// 用逐级扩大的测距环表示三个档位，按钮名称同时提供实际半径。
function patrolRadiusMarkup(radius){
 const choices=[[150,'近',5],[250,'中',8],[400,'远',11]];
 const buttons=choices.map(([meters,label,ring])=>{
  const icon='<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><circle cx="14" cy="14" r="'+ring+'" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="14" cy="14" r="2" fill="currentColor"/></svg>';
  return '<button type="button" class="ui-button" data-se-action="radius" data-se-key="combat" data-se-radius="'+meters+'" aria-pressed="'+(meters===radius)+'" aria-label="'+label+'距离，'+meters+'米">'+icon+'<span>'+label+'</span></button>';
 });
 return '<fieldset class="se-patrol-radius"><legend>巡战半径</legend><div>'+buttons.join('')+'</div></fieldset>';
}
// 两个自动释放条件分别保存，总开关关闭时保留每个条件的选择。
function flareAutoMarkup(build,enabled){
 const buttons=[['combat','战斗时自动释放'],['travel','非战斗时自动释放']].map(([mode,label])=>{
  const pressed=build.flareAuto?.[mode]!==false;
  return `<button type="button" class="ui-button" data-se-key="flare" data-se-action="flare-auto" data-flare-mode="${mode}" aria-pressed="${pressed}" ${enabled?'':'disabled'}>${label} · ${pressed?'开':'关'}</button>`;
 });
 return '<div class="logistics-actions" role="group" aria-label="照明弹自动释放条件">'+buttons.join('')+'</div>';
}
// 按真实安装、能量和库存显示，不使用另一个界面状态副本。
export function vehicleSEMarkup(g,h,{fit=false}={}){const b=seBuild(g.progress,h),reason=fit?vehicleBuildReason(g,h):'',s=g.seControl;
 return '<section class="ui-section"><h3>SE 特殊装置 · '+seMass(g.progress,h)+' kg</h3><p>已安装 '+b.installed.length+' 个，每种可装一套。关闭的装置仍计入载重，卸下后保存在该车工坊库存。'+(fit?reason:'前往小营地的车辆整备或载具工坊购买、安装和卸下装置。')+'</p>'+Object.entries(VEHICLE_SE).filter(([k])=>fit||b.installed.includes(k)).map(([k,r])=>{const installed=b.installed.includes(k),enabled=!b.disabled.includes(k);return '<section class="ui-inset"><h4 class="se-device-title" tabindex="-1" data-se-heading="'+k+'">'+seDeviceIcon(k)+r.name+(seLevel(b,k)?' +'+seLevel(b,k):'')+' · '+r.mass+' kg</h4><p>'+r.description+'</p>'+(fit?'<button class="ui-button" data-se-key="'+k+'" data-se-action="'+(installed?'remove':'install')+'" '+(reason?'disabled':'')+'>'+(installed?'卸下':b.owned.includes(k)?'免费重新安装':'购买并安装 · '+r.coins+'金币')+'</button>':'<button class="ui-button" data-se-key="'+k+'" data-se-action="toggle" aria-pressed="'+enabled+'">'+(k==='flare'?'照明器总开关 · ':'')+(enabled?'已开启 · 点击关闭':'已关闭 · 点击开启')+'</button>')+(!fit&&installed&&k==='flare'?flareAutoMarkup(b,enabled):'')+(!fit&&installed&&k==='combat'?patrolRadiusMarkup(b.radius):'')+(installed&&k==='protection'?'<p>拦截状态 · '+(b.protectionWait>0?'冷却 '+Math.ceil(b.protectionWait)+'秒':enabled?'就绪':'已关闭')+'</p>':'')+(installed&&k==='shield'?'<p>护罩 '+Math.floor(b.shield)+' / '+seShieldMax(b)+' · 恢复等待 '+Math.ceil(b.shieldWait)+'秒</p>':'')+(installed&&k==='flare'?'<p>照明弹库存 '+(g.progress.supplies.vehicles[h].flare||0)+' 发 · 所有营地有售，每发照明约45秒。</p>':'')+(installed&&k==='rocket'?'<p>重炮弹 '+(g.progress.supplies.vehicles[h].heavy||0)+' 发 · 冷却 '+Math.ceil(b.rocketWait)+'秒</p>':'')+'</section>';}).join('')+(!fit?'<p role="status">'+(s?s.status:'手动驾驶')+'</p><p>开启自动驾驶仪后会跟随当前导航。两套装置同时开启时，途中遇敌会先巡战，脱战后继续前往目的地。巡战时可手动走位，松开后恢复避弹；手动驶出范围会在新位置巡战。</p>':'')+'</section>';
}

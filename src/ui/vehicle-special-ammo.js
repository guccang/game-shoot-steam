import {seBuild} from '../config/vehicle-se.js';
// 当前载具页内的增强装填和照明开关；说明与库存都读取正式目录。
import {SPECIAL_AMMO} from '../config/vehicle-special-ammo.js';
import {ammoKind} from '../config/supplies.js';
import {ammoIcon} from './ammo-icons.js';
// 每个按钮同时显示弹种图案、名称和当前车辆的备用数量。
function shellChoice(key,name,icon,amount,selected,enabled){
 return `<button type="button" class="ui-button shell-choice" data-special-ammo="${key}" aria-pressed="${selected===key}" ${enabled?'':'disabled'}>
  <span class="ammo-symbol">${ammoIcon(icon)}</span><strong>${name}</strong><small>${amount} 发</small>
 </button>`;
}

// 装填选择使用与弹药铺、背包一致的弹种图案，照明器仍独立控制。
export function specialAmmoMarkup(game,weapon){
 const s=game.progress.supplies,h=game.vehicle.index,stock=s.vehicles[h],base=ammoKind(weapon);
 const enabled=['shell','heavy'].includes(base),selected=s.selectedSpecial[h]||'none';
 const choices=[shellChoice('none','普通炮弹',enabled?base:'shell',enabled?stock[base]||0:0,selected,enabled)];
 for(const [key,r] of Object.entries(SPECIAL_AMMO)){
  if(key!=='flare')choices.push(shellChoice(key,r.name,key,stock[key]||0,selected,enabled));
 }
 return `<section class="ui-section"><h3>主炮增强装填</h3><p>每次射击消耗普通炮弹＋1枚增强弹；增强弹耗尽后自动使用普通炮弹。标准炮与重炮适用。</p>
  <div class="shell-choices" role="group" aria-label="当前增强弹">${choices.join('')}</div>
  <p>${enabled?(SPECIAL_AMMO[selected]?.use||'选择增强弹，下一发起生效。'):'当前主炮不支持增强炮弹；安装照明 SE 后仍可使用照明弹。'}</p></section>`+'<section class="ui-section"><h3><span class="ammo-symbol">'+ammoIcon('flare')+'</span>自动照明</h3><p>'+(seBuild(game.progress,h).installed.includes('flare')?'已安装照明 SE。':'未安装照明 SE，当前不会发射。')+'库存 '+(stock.flare||0)+' 发 · 所有营地有售。夜间从车尾发射，升空时逐渐扩光，照明约45秒。光照随升高扩大，随下落收缩，落地慢慢熄灭；完全熄灭或驶离后补发，白天不消耗。</p><button class="ui-button" data-auto-flare aria-pressed="'+s.autoFlare+'">自动释放照明弹：'+(s.autoFlare?'开启':'关闭')+'</button></section>';}

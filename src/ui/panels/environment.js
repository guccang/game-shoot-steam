// Debug环境预览与手机只读摘要；预览值不写入日期、统计或存档。
import {WEATHER_NAMES} from '../../world/play-chronicle.js';
import {SEASON_NAMES,seasonRemaining} from '../../world/seasons.js';
import {TIME_NAMES,dayPhaseRemaining,weatherRemaining} from '../../world/environment.js';
import {durationFor} from '../../world/environment-timing.js';
import {actualEnvironment,previewEnvironment,clearEnvironmentPreview,environmentPreviewActive} from '../../world/environment-preview.js';
import {createEventScope} from '../../platform/events.js';
// 所有切换仅从Debug页面进入，手机环境图标保持信息展示。
export function createEnvironmentPanel({environment,root,dialogs}) {
 const $=id=>root.getElementById(id),scope=createEventScope();let clockKey='';
 // 手机只读说明独立于邻里和调试页面，关闭后回到原手机页面。
 const help=root.createElement('dialog');help.id='environment-help-dialog';help.className='ui-panel ui-panel--compact ui-sheet';help.setAttribute('aria-labelledby','environment-help-title');
 help.innerHTML='<header class="ui-panel__header"><h2 id="environment-help-title">天气与时间</h2><button type="button" class="ui-close" aria-label="关闭天气与时间说明">×</button></header><div class="ui-panel__body"><p data-environment-current></p><section class="ui-section"><h3>季节</h3><p>春、夏、秋、冬随游戏日期轮换，场景景观也会随季节变化。</p></section><section class="ui-section"><h3>时间</h3><p>一天分为白昼、黄昏和夜晚。黄昏是入夜前的过渡时段，夜间视野和攻击距离会缩短，可利用路灯和房屋灯光辨认道路。</p><p>游戏日期随有效游玩推进，暂停与离线不推进。小屋休息可以前往所选时段。</p></section><section class="ui-section"><h3>天气</h3><p>图标显示当前天气，如晴朗、小雨或大风。开启自然天气时，天气会自动变化。</p></section><p>图标外圈表示对应的季节、时段或天气进度。</p></div><footer class="ui-panel__footer"><button type="button" class="ui-button ui-button--primary" data-environment-help-close>知道了</button></footer>';root.body.append(help);
 // 读取当前显示状态，不改动日历、天气设置或邻里页签。
 function renderHelp(){help.querySelector('[data-environment-current]').textContent='当前：'+SEASON_NAMES[environment.forestSeason]+' · '+TIME_NAMES[environment.time]+' · '+WEATHER_NAMES[environment.weather];}
 dialogs.register(help.id,{onOpen:renderHelp});
 for(const id of ['season-picture','time-picture','weather-picture']){scope.on($(id),'click',event=>{event.stopPropagation();if(!help.open)root.body.append(help);dialogs.open(help.id);});$(id).setAttribute('aria-controls',help.id);}
 for(const button of help.querySelectorAll('.ui-close,[data-environment-help-close]'))scope.on(button,'click',()=>dialogs.close(help.id));
 // 圆环反映真实环境进度；预览期间不伪造时间余量。
 function renderClock(now=Date.now()) {
  const actual=actualEnvironment(environment),preview=environmentPreviewActive(environment);
  const key=[environment.forestSeason,environment.time,environment.weather,preview,Math.floor(now/1000)].join(':');
  if(key===clockKey)return;clockKey=key;
  for(const [kind,value,names,left,duration] of [
   ['season',environment.forestSeason,SEASON_NAMES,seasonRemaining(actual,now),durationFor(actual,'season')],
   ['time',environment.time,TIME_NAMES,dayPhaseRemaining(actual,now),durationFor(actual,actual.time)],
   ['weather',environment.weather,WEATHER_NAMES,weatherRemaining(actual,now),durationFor(actual,'weather')]]) {
    const label=names[value],node=$(kind+'-picture');
    $(kind+'-picture-label').textContent=label;
    node.title='查看天气与时间说明：'+label;node.setAttribute('aria-label',node.title);
    $(kind+'-picture-progress').style.strokeDashoffset=String(100*(1-Math.max(0,Math.min(1,left/duration))));
    node.dataset.running=String(!preview&&(kind!=='weather'||actual.autoWeather));
    const art=$(kind+'-picture-art'),src='/assets/environment/'+kind+'-'+value+'.svg';if(art.getAttribute('src')!==src)art.setAttribute('src',src);
  }
 }
 // 控件状态来自当前显示环境；恢复自然后立即展示仍在推进的真实状态。
 function renderEnvironment() {
  $('game-frame').dataset.time=environment.time;$('game-frame').dataset.weather=environment.weather;
  for(const [attr,key] of [['forest-season','forestSeason'],['time','time'],['weather','weather']])
   $('environment-dialog').querySelectorAll('[data-'+attr+']').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-'+attr)===environment[key])));
  $('environment-button').textContent='环境调试：季节、昼夜与天气';
  $('environment-preview-status').textContent=environmentPreviewActive(environment)?'预览中：正式日期和游玩统计仍按自然环境运行，退出游戏不保存预览。':'正在使用自然环境。';
  $('environment-reset').disabled=!environmentPreviewActive(environment);clockKey='';renderClock();
 }
 dialogs.register('environment-dialog',{onOpen:renderEnvironment});
 scope.on($('environment-button'),'click',()=>dialogs.open('environment-dialog'));
 for(const id of ['close-environment','environment-ok'])scope.on($(id),'click',()=>dialogs.close('environment-dialog'));
 scope.on($('environment-reset'),'click',()=>{clearEnvironmentPreview(environment);renderEnvironment();});
 scope.on($('environment-dialog'),'click',event=>{
  const b=event.target.closest('button');if(!b)return;
  const patch=b.dataset.forestSeason?{forestSeason:b.dataset.forestSeason}:b.dataset.time?{time:b.dataset.time}:b.dataset.weather?{weather:b.dataset.weather}:null;
  if(patch){previewEnvironment(environment,patch);renderEnvironment();}
 });
 return {render:renderEnvironment,renderClock,dispose(){scope.dispose();help.remove();}};
}

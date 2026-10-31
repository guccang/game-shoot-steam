import { i18nText } from "../../i18n/index.js";
import { chooseSeasonWeather } from '../../world/season-weather.js';
import { DEFAULT_TIMINGS, durationFor } from '../../world/environment-timing.js';
import { livingSeasonDays } from '../../world/living-calendar.js';
import { LIVING_DAY_MS } from '../../config/living-world.js';
// 天气与时段面板，环境时钟在 world 中，存储由应用注入。
import { restartDayCycle, weatherRemaining, TIME_NAMES, nextDayPhase, dayPhaseRemaining } from '../../world/environment.js';
import { SEASON_NAMES, nextSeason, restartSeasonCycle, seasonRemaining } from '../../world/seasons.js';
import { createEventScope } from '../../platform/events.js';
// 绑定环境表单与手机环境摘要，不直接访问浏览器存储。
export function createEnvironmentPanel({ environment, root, dialogs, onSave, onCycleRestart=()=>{} }) {
  const $ = (id) => root.getElementById(id),
    scope = createEventScope();
  let clockKey='',timingsDirty=false;
  // 具体剩余时间仅用于设置面板，手机摘要使用无数字圆环。
  function countdown(ms) { const seconds=Math.ceil(ms/1000);return i18nText("ui.panels.environment.1699788448", { p0: (Math.floor(seconds/60)), p1: (String(seconds%60).padStart(2,'0')) }); }
  // 环形余量每秒更新；名称、辅助提示均不显示具体时间数值。
  function renderClock(now=Date.now()) {
    const remaining=seasonRemaining(environment,now),season=environment.forestSeason;
    const weatherLeft=weatherRemaining(environment,now);
    const timeLeft=dayPhaseRemaining(environment,now);
    const key=`${season}:${Math.ceil(remaining/1000)}:${environment.weather}:${environment.autoWeather}:${Math.ceil(weatherLeft/1000)}:${environment.time}:${environment.autoTime}:${Math.ceil(timeLeft/1000)}`;
    if(key===clockKey)return;clockKey=key;
    $('season-picture-label').textContent=SEASON_NAMES[season];
    $('season-picture-progress').style.strokeDashoffset=String(100*(1-remaining/durationFor(environment,'season')));
    const next=nextSeason(season);
    const description=i18nText("ui.panels.environment.80f15ab46c", { p0: (SEASON_NAMES[season]), p1: (SEASON_NAMES[next]) });
    $('season-picture').setAttribute('aria-label',description);$('season-picture').title=description;
    const duration=durationFor(environment,environment.time);
    $('time-picture-progress').style.strokeDashoffset=String(100*(1-timeLeft/duration));
    $('time-picture').dataset.running=String(environment.autoTime);
    const timeNext=TIME_NAMES[nextDayPhase(environment.time)];
    const timeDescription=i18nText("ui.panels.environment.d0e421ad60", { p0: (TIME_NAMES[environment.time]), p1: (environment.autoTime?i18nText("ui.panels.environment.aeec217828", { p0: (timeNext) }):i18nText("ui.panels.environment.3e65c77987")), p2: (timeNext) });
    $('time-picture').setAttribute('aria-label',timeDescription);$('time-picture').title=timeDescription;
    if(environment.calendarActive&&!environment.livingPreview){
      for(const id of ['season-picture','time-picture']){$(id).setAttribute('aria-label','查看森林日期与邻里日程');$(id).title='查看森林日期与邻里日程';}
      $('time-picture').dataset.running='true';
    }
    $('weather-picture-progress').style.strokeDashoffset=String(100*(1-weatherLeft/durationFor(environment,'weather')));
    $('weather-picture').dataset.running=String(environment.autoWeather);
    const weatherName={sun:i18nText("ui.panels.environment.749c359ed0"),cloud:i18nText("ui.panels.environment.30c379777e"),rain:i18nText("ui.panels.environment.570764f969"),thunder:i18nText("ui.panels.environment.9ddc77d893"),snow:i18nText("ui.panels.environment.bc4e5aec66")}[environment.weather];
    const weatherDescription=i18nText("ui.panels.environment.a8aa8e8b69", { p0: (weatherName), p1: (environment.autoWeather?i18nText("ui.panels.environment.2bc01ddeb8"):i18nText("ui.panels.environment.95997adbf1")) });
    $('weather-picture').setAttribute('aria-label',weatherDescription);$('weather-picture').title=weatherDescription;
    $('environment-countdown').textContent=i18nText("ui.panels.environment.0c9eb6148e", { p0: (SEASON_NAMES[season]), p1: (countdown(remaining)), p2: (TIME_NAMES[environment.time]), p3: (environment.autoTime?i18nText("ui.panels.environment.c2793f9086", { p0: (countdown(timeLeft)) }):i18nText("ui.panels.environment.eb0c326b60")), p4: (environment.autoWeather?i18nText("ui.panels.environment.c2793f9086", { p0: (countdown(weatherLeft)) }):i18nText("ui.panels.environment.eb0c326b60")) });
  }
  // 同步环境按钮、过滤色与表单选项。
  function renderEnvironment() {
    const times = TIME_NAMES,
      weathers = { sun: i18nText("ui.panels.environment.749c359ed0"), cloud: i18nText("ui.panels.environment.30c379777e"), rain: i18nText("ui.panels.environment.570764f969"), thunder: i18nText("ui.panels.environment.9ddc77d893"), snow: i18nText("ui.panels.environment.bc4e5aec66") };
    $('game-frame').dataset.time = environment.time;
    const locked=environment.calendarActive&&!environment.livingPreview;
    root.querySelectorAll('[data-time],[data-forest-season],#auto-time,#timing-save,#timing-defaults,#environment-timings input').forEach(n=>{if('disabled' in n)n.disabled=locked;});
    $('game-frame').dataset.weather = environment.weather;
    const icon =
      environment.weather === 'thunder'
        ? 'ϟ'
        : environment.time === 'night'
          ? '☾'
          : { sun: '☀', cloud: '☁', rain: '☂', snow: '❄' }[environment.weather];
    $('environment-button').innerHTML =
      `${icon} ${times[environment.time]} · ${weathers[environment.weather]} <span>⌄</span>`;
    $('environment-button').title = i18nText("ui.panels.environment.025035aeb7");
    root.querySelectorAll('[data-weather]').forEach((button) => {
      if (button.tagName === 'BUTTON')
        button.setAttribute('aria-pressed', String(button.dataset.weather === environment.weather));
    });
    root.querySelectorAll('[data-time]').forEach((button) => {
      if (button.tagName === 'BUTTON')
        button.setAttribute('aria-pressed', String(button.dataset.time === environment.time));
    });
    root.querySelectorAll('[data-forest-season]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.forestSeason === environment.forestSeason));
    });
    // 图片来源固定在受控目录，标题与无障碍名称随状态同步。
    const season = environment.forestSeason;
    for (const [kind,value,label] of [['season',season,SEASON_NAMES[season]],['time',environment.time,times[environment.time]],['weather',environment.weather,weathers[environment.weather]]]) {
      const art = $(`${kind}-picture-art`), source = `/assets/environment/${kind}-${value}.svg`;
      if (art.getAttribute('src') !== source) art.setAttribute('src',source);
      if(kind!=='season') {
        $(`${kind}-picture-label`).textContent = label;
      }
    }
    renderClock();
    $('auto-weather').checked = environment.autoWeather;
    $('auto-time').checked = environment.calendarActive&&!environment.livingPreview?true:environment.autoTime;
    if(!timingsDirty)for(const key of Object.keys(DEFAULT_TIMINGS))$(`timing-${key}`).value=String(durationFor(environment,key)/60000);
  }
  // 输入未提交时不被自动换季覆盖；只重置本次确实修改的周期。
  scope.on($('environment-timings'),'input',()=>{timingsDirty=true;$('timing-feedback').textContent=i18nText("ui.panels.environment.14f2a44ed5");});
  scope.on($('timing-defaults'),'click',()=>{
    for(const [key,value] of Object.entries(DEFAULT_TIMINGS))$(`timing-${key}`).value=String(value/60000);
    timingsDirty=true;$('timing-feedback').textContent=i18nText("ui.panels.environment.dfecce32f6");
  });
  scope.on($('timing-save'),'click',()=>{
    if(environment.calendarActive&&!environment.livingPreview){$('timing-feedback').textContent=`森林采用${Number((LIVING_DAY_MS/60000).toFixed(2))}分钟一天、${livingSeasonDays()}天一季的生活历法。`;return;}
    const values={};
    for(const key of Object.keys(DEFAULT_TIMINGS)) {
      const field=$(`timing-${key}`);
      if(!field.reportValidity())return;
      values[key]=Number(field.value)*60000;
    }
    const old={timings:environment.timings,seasonAt:environment.seasonAt,dayCycleAt:environment.dayCycleAt,weatherAt:environment.weatherAt};
    const changed=Object.keys(values).filter(key=>values[key]!==durationFor(environment,key));
    environment.timings=values;
    if(changed.includes('season'))environment.seasonAt=Date.now();
    if(changed.includes('weather'))environment.weatherAt=Date.now();
    if(changed.some(key=>['day','dusk','night'].includes(key)))restartDayCycle(environment);
    const saved=onSave()!==false;
    if(!saved)Object.assign(environment,old);
    else {
      timingsDirty=false;
      if(changed.includes('season'))onCycleRestart('season');
      if(changed.some(key=>['day','dusk','night'].includes(key)))onCycleRestart('day');
    }
    clockKey='';renderEnvironment();
    $('timing-feedback').textContent=saved?i18nText("ui.panels.environment.2a928a24e5"):i18nText("ui.panels.environment.5171338650");
  });
  // 季节图片按春夏秋冬顺序前进；天气图片仍随机且排除当前值。
  scope.on($('season-picture'), 'click', () => {
    if(environment.calendarActive&&!environment.livingPreview)return;
    restartSeasonCycle(environment,nextSeason(environment.forestSeason));
    onCycleRestart('season');
    renderEnvironment();onSave();
  });
  // 点击昼夜只重置本时段，保持季节、天气和自动开关各自独立。
  scope.on($('time-picture'), 'click', () => {
    if(environment.calendarActive&&!environment.livingPreview)return;
    environment.time = nextDayPhase(environment.time);
    restartDayCycle(environment);
    onCycleRestart('day');
    renderEnvironment();onSave();
  });
  scope.on($('weather-picture'), 'click', () => {
    environment.weather = chooseSeasonWeather(environment.forestSeason,environment.weather);
    environment.weatherAt = Date.now();
    renderEnvironment();onSave();
  });
  dialogs.register('environment-dialog' , { onOpen: renderEnvironment });
  scope.on($('environment-button'), 'click', () => dialogs.open('environment-dialog'));
  for (const id of ['close-environment', 'environment-ok'])
    scope.on($(id), 'click', () => dialogs.close('environment-dialog'));
  scope.on($('environment-dialog'), 'click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if(environment.calendarActive&&!environment.livingPreview&&(button.dataset.time||button.dataset.forestSeason))return;
    if (button.dataset.weather) {
      environment.weather = button.dataset.weather;
      environment.weatherAt = Date.now();
    } else if (button.dataset.time) {
      environment.time = button.dataset.time;
      restartDayCycle(environment);
      onCycleRestart('day');
    } else if (button.dataset.forestSeason) {
      restartSeasonCycle(environment,button.dataset.forestSeason);
      onCycleRestart('season');
    } else return;
    renderEnvironment();
    onSave();
  });
  scope.on($('environment-dialog'), 'change', (event) => {
    if (event.target.id === 'auto-weather') {
      environment.autoWeather = event.target.checked;
      environment.weatherAt = Date.now();
    }
    if (event.target.id === 'auto-time') {
      if(environment.calendarActive&&!environment.livingPreview){event.target.checked=true;return;}
      environment.autoTime = event.target.checked;
      restartDayCycle(environment);
      onCycleRestart('day');
    }
    renderEnvironment();onSave();
  });
  return { render: renderEnvironment, renderClock, dispose: scope.dispose };
}

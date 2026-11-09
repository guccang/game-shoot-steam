import {CAMPAIGN_TASK_IDS} from '../config/mainline-pacing.js';
import {playerStorage} from '../platform/player-profile.js';
import {MAINLINE_TASKS} from '../config/mainline.js';
import { i18nHtml, i18nText } from "../i18n/index.js";
// 本机数值工作台：候选配置、Worker批次、正式靶场和报告互不修改玩家存档。
import { localizeDocument } from '../i18n/document.js';
import { loadGameFont } from '../platform/fonts.js';
import { locale } from '../i18n/index.js';
import { RECOMMENDED_ECONOMY, ORIGINAL_ECONOMY, validateEconomy, RESOURCE_KEYS, ECONOMY_LABELS } from '../config/economy.js';
import { DEFAULT_SCENARIO, DEFAULT_ROUTE, ROUTE_PRESETS, reportCSV } from './model.js';
import { WEAPONS } from '../config/weapons.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';
import { validateLedger } from '../progression/economy/economy-ledger.js';
import { parameterHelp, SCENARIO_HELP, activityHelp } from './help.js';
import { createRouteEditor } from './route-editor.js';
const $=id=>document.getElementById(id);
localizeDocument(document);
await loadGameFont();
let config=structuredClone(RECOMMENDED_ECONOMY),report=null,pinned=null,worker=null,benchWorker=null;
const names={farm:'种田',clearing:'清缴材料预算',perKill:'按基准配额计价',woodCeilings:'单次木材费用上限（追赶前）',taskRewards:'主线逐项奖励',attempts:'材料抽取次数',groupGrowth:'每组预算增幅',maxGrowth:'最高预算倍率',task:'任务与教学',travel:'移动与返程',workshop:'工坊施工',tree:i18nText("balance.app.e92807b856"),enemy:i18nText("balance.app.afa7488061"),boss:i18nText("app.game-events.3710639685"),drops:i18nText("balance.app.fd6ace8cf4"),realms:i18nText("balance.app.18967d386a"),upgrades:i18nText("balance.app.83f4098bd3"),growth:i18nText("balance.app.b137acf5a3"),challenges:'战斗轮次成长',weapons:i18nText("balance.app.69f2fc04a2"),turrets:i18nText("balance.app.f7f593fd4b"),vehicles:i18nText("balance.app.e0f3179302"),
  coins:i18nText("balance.app.bbece6f829"),wood:i18nText("balance.app.30a9333b4f"),parts:i18nText("balance.app.04480d568c"),crystal:i18nText("balance.app.00aedb5fc7"),core:i18nText("balance.app.a8a88ddbea"),firstCore:i18nText("balance.app.88f4cd582d"),coinScale:i18nText("balance.app.840e215511"),woodRatio:i18nText("balance.app.96d13eb920"),chance:i18nText("balance.app.e117e47830"),pity:i18nText("balance.app.f10c1ad3e1"),favoredChance:i18nText("balance.app.dc6a84d395"),favoredPity:i18nText("balance.app.a374119196"),
  coinsBase:i18nText("balance.app.a45ab367a9"),coinsStage:i18nText("balance.app.d1cc782d09"),woodBase:i18nText("balance.app.8a7bf21795"),woodStage:i18nText("balance.app.d6a6eb589f"),tierScale:i18nText("balance.app.2f58321a4a"),rogue:i18nText("balance.app.6e50adbfab"),tower:i18nText("balance.app.7ef49da8c6"),guardian:i18nText("balance.app.5a2d749d4b"),forest:i18nText("balance.app.3bfbf21e2f"),logging:i18nText("balance.app.e92807b856"),
  exponent:i18nText("balance.app.753027b495"),catchup:i18nText("balance.app.37f80ae31e"),base:i18nText("balance.app.65c51d7a26"),ceilings:i18nText("balance.app.022e804e36"),stages:i18nText("balance.app.53fac317ce"),heroes:i18nText("balance.app.c47b54e84e"),turret:i18nText("balance.app.49ec2a7840"),vehicle:i18nText("balance.app.4d4acd9679"),part:i18nText("balance.app.61cce4dc4b"),
  weapon:i18nText("balance.app.caeef86b06"),milestone:i18nText("balance.app.fbbf3ee722"),elite:i18nText("balance.app.ea04cb3ef1"),heroMilestone:i18nText("balance.app.187be902fa"),heroAttack:i18nText("balance.app.ad6fb2feca"),heroHealth:i18nText("balance.app.4b902efac3"),armor:i18nText("balance.app.e1edb6ad02"),survivalMilestone:i18nText("balance.app.6d743f4ba0"),realm:i18nText("balance.app.a5b5091297"),forestWavePerBoss:i18nText("balance.app.0b57927731"),gate:i18nText("balance.app.93921d9587")};
// 所有来自JSON或报告的内容先转义，导入文件不能注入页面。
function esc(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
// 路径只来自本地配置模板，页面输入不参与对象属性求值。
function getPath(root,path){return path.reduce((value,key)=>value[key],root);}
// 保存候选参数，不隐式发布到游戏。
function setPath(root,path,value){getPath(root,path.slice(0,-1))[path.at(-1)]=value;}
// 用途常显，较长的调整影响可点击或用键盘展开；不依赖鼠标悬浮。
function helpMarkup(id,help){
  if(!help)return '';
  return `<div id="${id}" class="field-help"><p>${esc(help[0])}</p><details><summary>${i18nHtml("balance.app.16f89bbcb1")}</summary><p>${esc(help[1])}</p></details></div>`;
}
// 固定表单与动态路线字段统一关联说明，保留原有输入值与事件。
function attachFieldHelp(id,help){
  const input=$(id);if(!input)return;
  const label=input.closest('label'),anchor=label||input,wrapper=document.createElement('div');
  wrapper.className='explained-field';anchor.before(wrapper);wrapper.append(anchor);
  wrapper.insertAdjacentHTML('beforeend',helpMarkup('help-'+id,help));
  input.setAttribute('aria-describedby','help-'+id);
}
// 按正式配置生成数值编辑器，保留装备编号与中文名称。
function parameterGroup(value,path=[]){
  return Object.entries(value).filter(([key])=>!['version','id','name','legacy'].includes(key)).map(([key,v])=>{
    if(!path.length&&key==='turrets')return '';
    // 怪物金币已停发；兼容字段仅用于旧候选的木材折算，不再显示金币产出编辑项。
    if(path[0]==='boss'&&key==='coins')return ''; // 兼容字段不提供第二套失效价格。
    if((['weapons','turrets','vehicles'].includes(path[0])&&key==='gate')||(path[0]==='challenges'&&['forest','realm'].includes(key)))return '';
    const next=[...path,key];
    let label=['weapons','turrets'].includes(path[0])&&path.length===1?key+' · '+WEAPONS[key]?.name:path[0]==='vehicles'&&path.length===1?key+' · '+COLLECTED_VEHICLES[key]?.name:names[key]||key;
    if(path[0]==='clearing'&&key==='coins')label='木材折算基数（不发金币）';
    if(path[0]==='taskRewards'&&path.length===1)label=MAINLINE_TASKS.find(t=>t.id===key)?.title||key;
    if(path[0]==='clearing'&&['coins','attempts'].includes(path[1]))label='第 '+(Number(key)+1)+' 波';
    if(path[0]==='upgrades'&&key==='weapons')label=i18nText("balance.app.ea92132bc9");
    if(path[0]==='upgrades'&&path[1]==='stages')label=[i18nText("balance.app.e0198241ab"),i18nText("balance.app.42730d3865"),i18nText("balance.app.d12e2b7658"),i18nText("balance.app.349e229272")][Number(key)];
    if(path[0]==='challenges'&&['forest','realm'].includes(path[1]))label=i18nText("balance.app.9f7836ce9b", { p0: (Number(key)+1) });
    if(typeof v==='boolean'){
      const id='param-'+next.join('-'),help=parameterHelp(next,config.legacy,config.clearing.perKill);
      return `<div class="param-row"><label for="${id}">${esc(label)}</label><input id="${id}" data-path="${next.join('.')}" type="checkbox" ${v?'checked':''} aria-describedby="help-${id}">${helpMarkup('help-'+id,help)}</div>`;
    }
    if(typeof v==='number'){
      const id='param-'+next.join('-'),help=parameterHelp(next,config.legacy,config.clearing.perKill);
      return '<div class="param-row"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" data-path="'+next.join('.')+'" type="number" step="any" min="0" value="'+v+'"'+(help?' aria-describedby="help-'+id+'"':'')+'>'+helpMarkup('help-'+id,help)+'</div>';
    }
    if(v&&typeof v==='object')return '<details><summary>'+esc(label)+'</summary><div class="params">'+parameterGroup(v,next)+'</div></details>';
    return '';
  }).join('');
}
// 切换计价方式时保留展开区与焦点，避免修改复选框后跳回参数列表顶部。
function renderEditor(preserve=false){
  const expanded=preserve?[...$('parameter-editor').querySelectorAll('details')].map(node=>node.open):[];
  const focused=preserve?document.activeElement?.id:null;
  $('parameter-editor').innerHTML=parameterGroup(config);
  $('config-json').value=JSON.stringify(config,null,2);
  if(preserve){[...$('parameter-editor').querySelectorAll('details')].forEach((node,index)=>node.open=expanded[index]);if(focused)$(focused)?.focus({preventScroll:true});}
}
// 下载使用短生命周期对象URL，文件保存后释放内存。
function download(name,content,type='application/json'){
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
// 状态区同时承担错误反馈，失败时不保留“正在运行”的误导状态。
function status(message,error=false){$('status').textContent=message;$('status').dataset.error=String(error);}
// 时间显示区分超出模拟时限与真正的零分钟。
function minutes(value){return value===null||value===undefined?i18nText("balance.app.178b10eef3"):i18nText("balance.app.f34c8f0bb4", { p0: ((value/60).toFixed(1)) });}
// 情景表单读取仍经模型校验；初始进度仅复制不写回游戏。
function scenario(){
  const weights=Object.fromEntries(Object.keys(ROUTE_PRESETS.mixed).map(k=>[k,Number($('weight-'+k).value)]));
  const route=routeEditor.read();
  return {...DEFAULT_SCENARIO,weights,route,collection:$('collection').value,minutes:Number($('minutes').value),efficiency:Number($('efficiency').value),
    failureRate:Number($('failure').value),movementShare:Number($('movement').value),strategy:$('strategy').value,priority:$('priority').value.trim().split(/\s+/),
    ...Object.fromEntries(['forestKills','treeRate','realmKills','bossSeconds','upgradeShare','workshopMinutes','expeditionMinutes'].map(k=>[k,Number($('rate-'+k).value)])),
    initial:$('initial-progress').value.trim()?JSON.parse($('initial-progress').value):null};
}
// 曲线使用代表种子的真实余额，纵轴保留单位，不混淆归一化资源。
function renderChart(){
  if(!report)return;
  const key=$('chart-resource').value,points=report.representative.curve,max=Math.max(1,...points.map(p=>p[key])),end=report.scenario.minutes;
  const x=n=>65+n/end*815,y=n=>220-n/max*190;
  const line=points.map((p,i)=>(i?'L':'M')+x(p.minute).toFixed(1)+' '+y(p[key]).toFixed(1)).join(' ');
  $('resource-chart').innerHTML=[0,.5,1].map(n=>'<line x1="65" y1="'+y(n*max)+'" x2="880" y2="'+y(n*max)+'" stroke="#c9d6be"/><text x="8" y="'+(y(n*max)+4)+'" fill="#506d47" font-size="12">'+Math.round(n*max)+'</text>').join('')+
    '<path d="'+line+'" fill="none" stroke="#347e87" stroke-width="2.5"/>'+
    [0,.25,.5,.75,1].map(n=>`<text x="${x(n*end)}" y="246" text-anchor="middle" fill="#506d47" font-size="12">${i18nHtml("balance.app.56acee29dd", { p0: (Math.round(n*end)) })}</text>`).join('');
}
// 每次购买展开，其间升级以计数表达；详细事件仍完整保留在JSON。
function renderReport(){
  const r=report,s=r.summary,p=r.representative;
  $('completion-label').textContent=i18nText("balance.app.18774ed381", { p0: (s.completed), p1: (s.samples) });
  $('metrics').innerHTML=[[i18nText("common.percentile", { p0: 10 }),minutes(s.p10)],[i18nText("common.percentile", { p0: 50 }),minutes(s.p50)],[i18nText("common.percentile", { p0: 90 }),minutes(s.p90)],[i18nText("balance.app.6707de42c2"),s.incomplete+' / '+s.samples],
    [i18nText("balance.app.58c18addda"),s.lateSamples?i18nText("balance.app.c36f6e2816", { p0: (s.longestLateGap.toFixed(2)) }):i18nText("balance.app.0caad9f56b")],[i18nText("balance.app.02d4bfd5c4"),s.lateGapOver12+' / '+s.lateSamples]]
    .map(([label,value])=>'<div class="metric"><b>'+esc(value)+'</b><span>'+label+'</span></div>').join('');
  $('timeline').innerHTML=p.timeline.map(e=>`<div class="timeline-row"><time>${i18nHtml("balance.app.fb36be9756", { p0: (e.minute.toFixed(0)) })}</time><div>${esc(e.name)}<small>${i18nHtml("common.namedLevel", { p0: esc(({buy:i18nText("balance.app.cc6f86bd41"),upgrade:i18nText("balance.app.94996ca622"),part:i18nText("balance.app.a2345efc60"),modify:i18nText("balance.app.07169a84ba")})[e.type]), p1: e.level })}</small></div></div>`).join('');
  // 任务奖励与成长事件分别展示，领取资源不冒充装备成长。
  $('task-timeline').innerHTML=(p.taskTimeline||[]).map(t=>`<div class="timeline-row"><time>${t.minute.toFixed(1)} 分</time><div>${esc(t.title)}<small>${Object.entries(t.reward).filter(([,n])=>n>0).map(([k,n])=>esc(ECONOMY_LABELS[k])+' +'+n).join(' · ')}</small></div></div>`).join('');
  $('resource-table').innerHTML=`<caption>${i18nHtml("balance.app.796f5fe51e")}</caption><thead><tr><th>${i18nHtml("balance.app.daa6d02a55")}</th><th>${i18nHtml("balance.app.0d98ffa2cf")}</th><th>${i18nHtml("balance.app.4c97f9db08")}</th><th>${i18nHtml("balance.app.0214e71438")}</th><th>${i18nHtml("balance.app.d6822b0417")}</th></tr></thead><tbody>${RESOURCE_KEYS.map(k=>'<tr><td>'+ECONOMY_LABELS[k]+'</td>'+[p.initial[k],p.totals.income[k]||0,p.totals.expense[k]||0,p.remaining[k]].map(n=>'<td>'+n.toLocaleString()+'</td>').join('')+'</tr>').join('')}</tbody>`;
  $('bottleneck').textContent=i18nText("balance.app.4c8a9e8ff7", { p0: (s.longestGap.toFixed(2)), p1: (p.deficits.length?i18nText("balance.app.576a1ba0d4", { p0: (p.deficits.map(d=>(ECONOMY_LABELS[d.key]||i18nText("balance.app.ba2b3bd76e"))+' '+d.missing).join('、')) }):i18nText("balance.app.e200fe1e3f")) });
  $('source-table').innerHTML=`<div class="table-scroll"><table><tr><th>${i18nHtml("balance.app.9e9bead814")}</th><th>${i18nHtml("balance.app.9ed933e1bd")}</th>${RESOURCE_KEYS.map(k=>`<th>${i18nHtml("balance.app.cf731fb7fc", { p0: (ECONOMY_LABELS[k]) })}</th>`).join('')}<th>${i18nHtml("balance.app.28384d7afd")}</th></tr>${Object.entries(p.activityTimes).map(([k,t])=>'<tr><td>'+names[k]+'</td><td>'+(t/60).toFixed(1)+'</td>'+RESOURCE_KEYS.map(key=>'<td>'+((p.sources[k]?.[key]||0)/Math.max(1,t/60)).toFixed(2)+'</td>').join('')+'<td>'+(p.failures[k]||0)+'</td></tr>').join('')}</table></div>`;
  if(p.waiting?.length)$('bottleneck').textContent+=i18nText("balance.app.618e1283a5", { p0: (p.waiting.map(x=>(ECONOMY_LABELS[x.key]||i18nText("balance.app.ba2b3bd76e"))+' '+(x.minutes===null?i18nText("balance.app.da0db6b78b"):i18nText("balance.app.e235256e97", { p0: (x.minutes.toFixed(1)) }))).join('、')) });
  $('bottleneck').textContent+=' · 主线完成 '+p.mainlineCompleted+'/'+CAMPAIGN_TASK_IDS.length+' · 首次升级 '+(p.firstUpgrade?.toFixed(2)??'未发生')+' 分钟';
  $('assumptions').innerHTML=r.assumptions.map(a=>'<li>'+esc(a)+'</li>').join('');
  renderChart();renderComparison();
}
// 对比保留各自配置与情景标签，避免把不同玩法误认为同条件调参。
function renderComparison(){
  $('comparison').innerHTML=!pinned?`<p class="hint">${i18nHtml("balance.app.d8a66b7182")}</p>`:`<div class="table-scroll"><table><tr><th>${i18nHtml("balance.app.6f949ac352")}</th><th>${i18nHtml("balance.app.2810c1ae78")}</th><th>${i18nHtml("common.percentile", { p0: 50 })}</th><th>${i18nHtml("balance.app.43ca7616b8")}</th><th>${i18nHtml("balance.app.df22bfc427")}</th></tr>${[pinned,report].filter(Boolean).map(r=>'<tr><td>'+esc(r.config.name)+'</td><td>'+r.scenario.efficiency+'</td><td>'+minutes(r.summary.p50)+'</td><td>'+r.summary.completed+' / '+r.summary.samples+'</td><td>'+(r.summary.lateSamples?i18nText("balance.app.56acee29dd", { p0: (r.summary.longestLateGap.toFixed(2)) }):i18nText("balance.app.63ef182b76"))+'</td></tr>').join('')}</table></div>`;
}
// 终止Worker立即释放计算，旧回调不能覆盖新任务。
function stop(){worker?.terminate();worker=null;$('run').disabled=false;$('cancel').hidden=true;}
$('run').onclick=()=>{
  try{
    const c=validateEconomy(config),s=scenario();stop();worker=new Worker('/src/balance/worker.js?lang='+encodeURIComponent(locale),{type:'module'});
    $('run').disabled=true;$('cancel').hidden=false;status(i18nText("balance.app.70cc2b6ef6"));
    worker.onmessage=event=>{stop();if(event.data.error){status(event.data.error,true);return;}report=event.data.report;renderReport();status(i18nText("balance.app.3bea39a34f"));};
    worker.onerror=event=>{stop();status(event.message||i18nText("balance.app.e4c3b149ad"),true);};
    worker.postMessage({config:c,scenario:s});
  }catch(error){stop();status(error.message,true);}
};
$('cancel').onclick=()=>{stop();status(i18nText("balance.app.3b48d5d3f6"));};
$('preset').onchange=()=>{config=structuredClone($('preset').value==='original'?ORIGINAL_ECONOMY:RECOMMENDED_ECONOMY);renderEditor();status(i18nText("balance.app.85e1050843"));};
$('parameter-editor').oninput=event=>{if(!event.target.dataset.path)return;setPath(config,event.target.dataset.path.split('.'),event.target.type==='checkbox'?event.target.checked:Number(event.target.value));config.id='custom';config.name=i18nText("balance.app.b0f4be1872");$('config-json').value=JSON.stringify(config,null,2);if(event.target.type==='checkbox')renderEditor(true);};
$('apply-json').onclick=()=>{try{config=structuredClone(validateEconomy(JSON.parse($('config-json').value)));renderEditor();status(i18nText("balance.app.279c73ce86"));}catch(error){status(error.message,true);}};
$('import-config').onclick=()=>$('config-file').click();
$('config-file').onchange=async event=>{try{config=structuredClone(validateEconomy(JSON.parse(await event.target.files[0].text())));renderEditor();status(i18nText("balance.app.6f874e9705"));}catch(error){status(error.message,true);}event.target.value='';};
$('export-config').onclick=()=>{try{download('forest-economy-config.json',JSON.stringify(validateEconomy(config),null,2));}catch(error){status(error.message,true);}};
const routeEditor=createRouteEditor($('target-route'),DEFAULT_ROUTE,()=>status(i18nText("balance.app.c309982d2e")));
$('activity-weights').innerHTML=Object.entries(ROUTE_PRESETS.mixed).map(([k,v])=>`<label>${i18nHtml("balance.app.46ff232309", { p0: (names[k]) })}<input id="weight-${k}" type="number" min="0" step=".05" value="${v}"></label>`).join('');
$('rate-fields').innerHTML=[['forestKills',i18nText("balance.app.e6616245ce")],['treeRate',i18nText("balance.app.bfb367b5a2")],['realmKills',i18nText("balance.app.f24981b289")],['bossSeconds',i18nText("balance.app.b4e7d315c7")],['upgradeShare',i18nText("balance.app.14c403bc86")],['workshopMinutes',i18nText("balance.app.619283eacb")],['expeditionMinutes',i18nText("balance.app.8671850dcb")]].map(([k,n])=>'<label>'+n+'<input id="rate-'+k+'" type="number" step="any" min="0" value="'+DEFAULT_SCENARIO[k]+'"></label>').join('');
Object.entries(SCENARIO_HELP).forEach(([id,help])=>attachFieldHelp(id,help));
Object.keys(ROUTE_PRESETS.mixed).forEach(key=>attachFieldHelp('weight-'+key,activityHelp(key)));
$('route').onchange=()=>{for(const [k,v] of Object.entries(ROUTE_PRESETS[$('route').value]))$('weight-'+k).value=v;};
$('chart-resource').onchange=renderChart;
$('pin-report').onclick=()=>{if(!report){status(i18nText("balance.app.0c43a2a8d0"),true);return;}pinned=structuredClone(report);renderComparison();};
$('clear-comparison').onclick=()=>{pinned=null;renderComparison();};
$('export-report').onclick=()=>{if(report)download('forest-economy-report.json',JSON.stringify(report,null,2));else status(i18nText("balance.app.0c43a2a8d0"),true);};
$('export-csv').onclick=()=>{if(report)download('forest-economy-report.csv',reportCSV(report),'text/csv;charset=utf-8');else status(i18nText("balance.app.0c43a2a8d0"),true);};
$('import-progress').onclick=()=>{try{const raw=playerStorage().getItem('forest-patrol-v1');if(!raw)throw Error(i18nText("balance.app.7ab0079f19"));$('initial-progress').value=JSON.stringify(JSON.parse(raw),null,2);status(i18nText("balance.app.3d270c537b"));}catch(error){status(error.message,true);}};
$('import-ledger').onclick=()=>$('ledger-file').click();
$('ledger-file').onchange=async event=>{
  try{const raw=JSON.parse(await event.target.files[0].text());if(raw.ledger?.version!==1)throw Error(i18nText("balance.app.4d22c54fb8"));
    const l=validateLedger(raw.ledger);$('ledger-summary').textContent=i18nText("balance.app.b1856ad85e", { p0: ((l.seconds/60).toFixed(1)), p1: (l.events.length), p2: (l.discarded), p3: (Object.entries(l.activities).map(([k,v])=>i18nText("balance.app.d3ee1af4fd", { p0: (names[k]||k), p1: ((v/60).toFixed(1)) })).join('、')) });
  }catch(error){status(error.message,true);}event.target.value='';
};
$('bench-weapon').innerHTML=WEAPONS.map((w,i)=>'<option value="'+i+'">'+w.name+'</option>').join('');
$('benchmark').onclick=()=>{
  try{
    const c=validateEconomy(config),index=Number($('bench-weapon').value),level=Number($('bench-level').value);
    benchWorker?.terminate();benchWorker=new Worker('/src/balance/benchmark-worker.js?lang='+encodeURIComponent(locale),{type:'module'});
    $('benchmark').disabled=true;$('bench-status').textContent=i18nText("balance.app.ee0424cd5a");$('bench-status').dataset.error='false';
    benchWorker.onmessage=event=>{
      $('benchmark').disabled=false;benchWorker.terminate();benchWorker=null;
      if(event.data.error){$('bench-status').textContent=event.data.error;$('bench-status').dataset.error='true';return;}
      const b=event.data.result;$('bench-status').textContent=b.note;
      const fmt=v=>v===null?i18nText("balance.app.53ad1c1541"):Number(v.toFixed(2));
      $('benchmark-table').innerHTML=`<caption>${i18nHtml("balance.app.f5b4017c2f", { p0: (level), p1: (level+1) })}</caption><tr><th>${i18nHtml("balance.app.7f72f06a88")}</th><th>${i18nHtml("balance.app.89f418c095")}</th><th>${i18nHtml("balance.app.b756bd92b5")}</th><th>${i18nHtml("balance.app.694e523851")}</th><th>${i18nHtml("balance.app.398b2e7f88")}</th><th>${i18nHtml("balance.app.28d7403ac2")}</th></tr>${b.results.map(row=>'<tr><td>'+row.name+'</td>'+['damage','effectiveDps','firstKillSeconds','kills','shotsPerKill'].map(k=>'<td>'+fmt(row.before[k])+' → '+fmt(row.after[k])+'</td>').join('')+'</tr>').join('')}<tr><td>${i18nHtml("balance.app.f5b75324b4")}</td><td colspan="5">${i18nHtml("balance.app.f0d44e2ca0", { p0: (b.results[0].before.heroHp), p1: (b.results[0].after.heroHp) })}</td></tr><tr><td>${i18nHtml("balance.app.825b2c9915")}</td><td colspan="5">${i18nHtml("balance.app.f379dee76c", { p0: (b.results[0].before.hullHp), p1: (b.results[0].after.hullHp) })}</td></tr>`;
    };
    benchWorker.onerror=e=>{$('benchmark').disabled=false;$('bench-status').textContent=e.message;benchWorker?.terminate();benchWorker=null;};
    benchWorker.postMessage({config:c,index,level});
  }catch(error){$('bench-status').textContent=error.message;$('benchmark').disabled=false;}
};
window.addEventListener('pagehide',()=>{stop();benchWorker?.terminate();});
renderEditor();renderComparison();

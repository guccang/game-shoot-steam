// 工坊熟练度展示只读正式经验、奖励和门槛，不创建另一份养成进度。
import {WEAPONS} from '../../config/weapons.js';
import {isVehicleArmament} from '../../config/vehicle-armaments.js';
import {masteryInfo,MASTERY_THRESHOLDS,MASTERY_REWARDS,MOD_MASTERY_LEVEL} from '../../config/weapon-mods.js';

// 车体不冒充武器熟练度；切换或预览挂载时绑定画面中实际选择的枪械。
export function workshopMastery(progress,{kind,index,turret=null}){
 const weaponIndex=kind==='weapons'?index:turret;
 if(kind==='weapons'&&WEAPONS[index]?.attackKind==='defense')return {supported:false,title:'能量防护盾 · 防御装备',hint:'升级护盾核心增加容量，升级充能线圈提高恢复速度',help:['装备后自动保护角色与所驾驶的载具，载具主炮继续攻击。','护盾耗尽后仍会受到伤害，请留意余量并适时走位。','防护盾不通过击杀积累熟练度，部件升级没有熟练度要求。']};
 if(!Number.isInteger(weaponIndex)||!WEAPONS[weaponIndex]||kind!=='weapons'&&isVehicleArmament(weaponIndex))return {
  supported:false,title:Number.isInteger(weaponIndex)?'专属主炮 · 无熟练度门槛':'车体 · 无熟练度门槛',
  hint:'车体、主炮和部件按装备等级升级',
  help:['车体装甲、动力和专属主炮没有熟练度要求。',`普通枪械的二选一改装套件才需要熟练度 ${MOD_MASTERY_LEVEL} 级。`,'载具固定使用自己的主武器；驾驶距离不会增加角色枪械熟练度。'],
 };
 const info=masteryInfo(progress,weaponIndex),name=WEAPONS[weaponIndex].name;
 const required=MASTERY_THRESHOLDS[MOD_MASTERY_LEVEL-1],missing=Math.max(0,required-info.xp);
 return {supported:true,weaponIndex,...info,name,missing,
  title:`${kind==='vehicle'?name+' · ':''}熟练度 ${info.level} 级`,
  count:info.next===null?'已满级':`${info.xp} / ${info.next} 点`,
  hint:missing?`套件 ${MOD_MASTERY_LEVEL} 级解锁 · 还差 ${missing} 点 · 本枪击败怪物 +${MASTERY_REWARDS.enemy}`:
   `套件已解锁${info.next===null?'':` · 距 ${info.level+1} 级还差 ${info.next-info.xp} 点`}`,
  help:[`使用「${name}」完成击败才增加经验，单纯命中和空射不增加。`,
   `怪物 +${MASTERY_REWARDS.enemy}　领主 +${MASTERY_REWARDS.boss}　用枪打倒树木 +${MASTERY_REWARDS.tree}`,
   `熟练度 ${MOD_MASTERY_LEVEL} 级（累计 ${required} 点）解锁二选一套件；伤害、弹仓等基础部件升级不要求熟练度。`,
   '同名手持枪与车载枪共用熟练度，装备等级和部件升级仍各自独立。',
   '只计普通森林战斗；工坊试射、故事、娱乐及任务怪不增加永久熟练度。'],
 };
}

// 二级说明沿用原生弹窗，关闭后回到问号，底层工坊与试装草稿保持原样。
export function createWorkshopMastery({root,dialogs,scope}){
 const $=id=>root.getElementById(id),help=root.createElement('dialog');
 help.id='ws-mastery-dialog';help.className='ws-mastery-dialog';help.setAttribute('aria-labelledby','ws-mastery-help-title');
 help.innerHTML='<header><h2 id="ws-mastery-help-title">熟练度怎么提升</h2><button id="ws-mastery-help-close" type="button" aria-label="关闭熟练度说明">×</button></header><p id="ws-mastery-help-equipment"></p><ul id="ws-mastery-help-lines"></ul><button id="ws-mastery-help-done" type="button">知道了</button>';
 root.body.append(help);dialogs.register(help.id,{focusId:'ws-mastery-help-close'});
 scope.on($('ws-mastery-help'),'click',()=>dialogs.open(help.id));
 for(const id of ['ws-mastery-help-close','ws-mastery-help-done'])scope.on($(id),'click',()=>dialogs.close(help.id));
 scope.on(help,'close',()=>{if($('workshop-dialog').open)$('ws-mastery-help').focus({preventScroll:true});});
 scope.on($('workshop-dialog'),'close',()=>{if(help.open)dialogs.close(help.id);});
 // 只展示正式经验；试装副本为预览放宽的门槛不能显示成已解锁。
 function render(progress,selection){
  const model=workshopMastery(progress,selection),bar=$('ws-mastery-progress');
  $('ws-mastery').dataset.locked=String(model.missing>0);
  $('ws-mastery-title').textContent=model.title;$('ws-mastery-count').textContent=model.count||'';
  bar.hidden=!model.supported;
  if(model.supported){bar.max=model.next??MASTERY_THRESHOLDS.at(-1);bar.value=model.xp;bar.setAttribute('aria-valuetext',`${model.title}，累计 ${model.xp} 点${model.next===null?'，已满级':`，下一级 ${model.next} 点`}`);}
  $('ws-mastery-hint').textContent=model.hint;
  $('ws-mastery-help-equipment').textContent=model.name||model.title;
  $('ws-mastery-help-lines').replaceChildren(...model.help.map(line=>{const item=root.createElement('li');item.textContent=line;return item;}));
 }
 // 主工坊释放时同时关闭说明，避免留下不可见的顶层模态。
 function dispose(){if(help.open)dialogs.close(help.id);help.remove();}
 return {render,dispose};
}

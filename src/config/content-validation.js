// 内容配置校验：字段结构、任务关联、成长阶梯与战斗数值一起验证，错误路径供数值工具定位。
import {CONTENT_DATA} from './content-catalog.js';
import {GAMEPLAY_VALUES} from './gameplay-values.js';
import {GAMEPLAY_TABLES} from './gameplay-tables.js';
import {validateGameplayConfig} from './gameplay-validation.js';
import {MAINLINE_SITES,MAINLINE_NPCS} from './mainline.js';
import {COLLECTED_VEHICLES} from './vehicles.js';
import {WEAPONS} from './weapons.js';
import {CAMP_GATES} from './camp-defense.js';
import {MAINLINE_SEEN} from '../progression/mainline-progress.js';
import {FARM_CROPS} from './farm.js';
import {HEROES} from './heroes.js';

// 固定机制身份属于程序合同，配置不能凭空声明不存在的行为或美术。
const RANGED_IDS=['spore-spitter','acorn-slinger','reed-archer','bramble-buggy','stump-bombard'];
const OPERATIONS=['click','upgrade','hero-experience','trial','patrol-boss','buy','equip','modify','story','drive','clearing','dismount','track','controller','menu','camp-defense','farm'];
const ACTIONS=['seed-shop','menu','workshop','clearing','fire','realm','camp-defense','farm'];
const SEEN=MAINLINE_SEEN;
// 校验错误始终包含可定位的内容路径。
function fail(path,message){throw Error(`内容配置 ${path}：${message}`);}
// 必填和可选字段均显式声明，拼写错误不允许静默失效。
function object(value,path,required,optional=[]){
 if(!value||typeof value!=='object'||Array.isArray(value))fail(path,'必须是对象');
 for(const key of required)if(!Object.hasOwn(value,key))fail(path+'.'+key,'缺少字段');
 for(const key of Object.keys(value))if(![...required,...optional].includes(key))fail(path+'.'+key,'未知字段');
}
// 数量、倍率和阈值统一检查有限性与可选整数约束。
function number(value,path,min=0,integer=false){if(typeof value!=='number'||!Number.isFinite(value)||value<min||(integer&&!Number.isSafeInteger(value)))fail(path,'数值非法');}
// 内容数组必须存在，可按用途禁止空表。
function array(value,path,min=1){if(!Array.isArray(value)||value.length<min)fail(path,'必须是满足最小长度的数组');}
// 玩家文案与稳定标识必须为非空文字。
function text(value,path){if(typeof value!=='string'||!value.trim())fail(path,'必须是非空文字');}
// 一组属性全部为数值，防止把文本或缺失属性带入战斗计算。
function numbers(value,path,required,optional=[],min=0){object(value,path,required,optional);for(const [key,n]of Object.entries(value))number(n,path+'.'+key,min);}
// 条件只允许解释器支持的结构，禁止混合多种条件导致某个门槛被忽略。
function condition(c,path){
 object(c,path,[],['all','any','path','min','equals','nativeLevel','tier','controllerReady','controllerLevel','harvestFor']);
 const kinds=['all','any','path','nativeLevel','tier','controllerReady','controllerLevel','harvestFor'].filter(k=>Object.hasOwn(c,k));
 if(kinds.length!==1)fail(path,'必须且只能声明一种条件');
 const kind=kinds[0],expected=[kind];
 if(['path','nativeLevel'].includes(kind))expected.push(Object.hasOwn(c,'equals')?'equals':'min');
 object(c,path,expected);
 if(kind==='all'||kind==='any'){array(c[kind],path);c[kind].forEach((v,i)=>condition(v,`${path}.${kind}.${i}`));}
 else if(kind==='path'){
  text(c.path,path+'.path');
  if(!/^progress\.[\w.-]+$/.test(c.path)||c.path.split('.').some(k=>['__proto__','prototype','constructor'].includes(k)))fail(path+'.path','必须引用合法进度路径');
  if(c.path.startsWith('progress.mainline.seen.')&&!SEEN.includes(c.path.split('.').at(-1)))fail(path+'.path','未注册的操作记录');
  if('min' in c)number(c.min,path+'.min');else if(!['number','boolean','string'].includes(typeof c.equals))fail(path+'.equals','必须是标量');
 }else if(kind==='nativeLevel'){number(c.nativeLevel,path+'.nativeLevel',0,true);if(!COLLECTED_VEHICLES[c.nativeLevel])fail(path,'载具不存在');number(c.min,path+'.min',1,true);}
 else if(kind==='controllerReady'){if(c[kind]!==true)fail(path,'必须为 true');}
 else if(kind==='harvestFor')text(c[kind],path+'.harvestFor');
 else number(c[kind],path+'.'+kind,1,true);
}
// 操作只能调用已有入口；装备索引必须对应正式目录。
function operation(op,path){
 object(op,path,['type'],['dialog','selector','label','kind','index','part','indices','chapter','native','id','gate','record','win','choice']);
 if(!OPERATIONS.includes(op.type))fail(path+'.type','操作类型未实现');
 if(op.type==='farm'&&!['dig','plant','water','harvest'].includes(op.id))fail(path+'.id','农活步骤不存在');
 // 发动机任务只指向正式可换装型号，报价和高亮使用相同选择。
 if(op.choice!==undefined&&(op.type!=='upgrade'||op.kind!=='vehicle'||op.part!=='engine'||![1,2].includes(op.choice)))fail(path+'.choice','发动机型号不存在');
 if(op.kind&&!['weapons','vehicle'].includes(op.kind))fail(path+'.kind','装备类别不存在');
 const choices=op.indices||('index'in op?[op.index]:[]);
 if(op.indices)array(op.indices,path+'.indices');
 for(const index of choices){number(index,path+'.index',0,true);const rows=op.type==='hero-experience'?HEROES:op.kind==='vehicle'?COLLECTED_VEHICLES:WEAPONS;if(!rows[index])fail(path+'.index','装备或角色不存在');}
 if(['upgrade','buy','equip','modify','drive','track','controller','trial'].includes(op.type)&&(!op.kind||!choices.length))fail(path,'缺少装备目标');
 if(op.type==='click'){text(op.dialog,path+'.dialog');text(op.selector,path+'.selector');}
 if(op.type==='camp-defense'){if(!CAMP_GATES.some(g=>g.id===op.gate))fail(path+'.gate','营门不存在');if(!SEEN.includes(op.record))fail(path+'.record','未注册的操作记录');}
 if(op.record!==undefined&&!SEEN.includes(op.record))fail(path+'.record','未注册的操作记录');
 if(op.win!==undefined&&(op.type!=='camp-defense'||typeof op.win!=='boolean'))fail(path+'.win','胜利条件仅用于兽潮');
 if(op.type==='story')text(op.chapter,path+'.chapter');
 if(op.type==='upgrade')text(op.part,path+'.part');
}
// 导航动作只声明已有界面入口，不在配置内执行代码。
function action(a,path){
 if(a===null||a===false)return;
 object(a,path,['type'],['id','label','kind','index','mode','gate']);
 if(!ACTIONS.includes(a.type))fail(path+'.type','动作类型未实现');
 if(a.label!==undefined)text(a.label,path+'.label');
 if(a.type==='camp-defense'&&!CAMP_GATES.some(g=>g.id===a.gate))fail(path+'.gate','营门不存在');
 if(a.type==='menu')text(a.id,path+'.id');
 if(a.type==='workshop')operation({type:'trial',kind:a.kind,index:a.index},path);
}
// 按任务 ID 校验关联，顺序本身由表决定；新任务可复用既有条件和操作。
function mainline(data){
 object(data,'mainline',['_说明','tasks','gates']);array(data.tasks,'mainline.tasks');array(data.gates,'mainline.gates',0);
 const ids=new Set();
 data.tasks.forEach((task,i)=>{
  const p=`mainline.tasks.${i}`;
  object(task,p,['id','chapter','title','npc','site','goal','text','lines','finish','reward','guide'],['action','target','targetWhen','experience','gardening','seedDelivery','seedReward','deferUntil']);

  if(task.seedReward){object(task.seedReward,p+'.seedReward',['crop','count']);number(task.seedReward.crop,p+'.seedReward.crop',0,true);number(task.seedReward.count,p+'.seedReward.count',1,true);if(!FARM_CROPS[task.seedReward.crop]||task.seedReward.count>9999)fail(p+'.seedReward','种子奖励超出范围');}
  if(task.gardening){
   const harvest=task.gardening.kind==='harvest';object(task.gardening,p+'.gardening',harvest?['kind']:['kind','crop']);
   if(!['drop','purchase','grow','harvest'].includes(task.gardening.kind))fail(p+'.gardening.kind','园艺委托类型不存在');
   if(!harvest){number(task.gardening.crop,p+'.gardening.crop',0,true);if(!FARM_CROPS[task.gardening.crop])fail(p+'.gardening.crop','作物不存在');}
  }
  // 收获预算必须引用后续的正式任务，避免配错目标后出现零费用或循环委托。
  if(task.goal?.harvestFor&&(task.gardening?.kind!=='harvest'||!data.tasks.slice(i+1).some(t=>t.id===task.goal.harvestFor&&!t.goal.harvestFor)))fail(p+'.goal.harvestFor','必须引用后续整备任务并配置收获委托');
  if(task.seedDelivery){object(task.seedDelivery,p+'.seedDelivery',['crop','count']);number(task.seedDelivery.crop,p+'.seedDelivery.crop',0,true);number(task.seedDelivery.count,p+'.seedDelivery.count',1,true);if(!FARM_CROPS[task.seedDelivery.crop])fail(p+'.seedDelivery.crop','种子不存在');}
  for(const key of ['id','chapter','title','npc','site','text','finish'])text(task[key],p+'.'+key);
  if(ids.has(task.id))fail(p+'.id','任务 ID 重复');ids.add(task.id);
  if(!Object.hasOwn(MAINLINE_NPCS,task.npc))fail(p+'.npc','人物不存在');
  for(const key of ['site','target'])if(task[key]&&!Object.hasOwn(MAINLINE_SITES,task[key]))fail(p+'.'+key,'地点不存在');
  array(task.lines,p+'.lines');task.lines.forEach((line,j)=>text(line,`${p}.lines.${j}`));
  condition(task.goal,p+'.goal');if(task.targetWhen)condition(task.targetWhen,p+'.targetWhen');
  numbers(task.reward,p+'.reward',[],['coins','wood','parts','crystal','core']);
  for(const [key,n]of Object.entries(task.reward))number(n,p+'.reward.'+key,0,true);
  object(task.guide,p+'.guide',['cue','thanks','steps']);text(task.guide.cue,p+'.guide.cue');text(task.guide.thanks,p+'.guide.thanks');array(task.guide.steps,p+'.guide.steps');
  if(task.guide.steps.length!==(task.goal.all?.length||1))fail(p+'.guide.steps','步骤数必须与顶层条件数相同');
  task.guide.steps.forEach((step,j)=>{const q=`${p}.guide.steps.${j}`;object(step,q,['label','hint'],['operation','action','highlight','navigation']);if(step.navigation!==undefined&&step.navigation!==false&&!Object.hasOwn(MAINLINE_SITES,step.navigation))fail(q+'.navigation','地点不存在');text(step.label,q+'.label');text(step.hint,q+'.hint');if(step.operation)operation(step.operation,q+'.operation');if('action'in step)action(step.action,q+'.action');});
  if(task.action)action(task.action,p+'.action');
  if(task.experience){object(task.experience,p+'.experience',['vehicle','kills','waves']);if(!COLLECTED_VEHICLES[task.experience.vehicle])fail(p+'.experience.vehicle','载具不存在');for(const key of ['kills','waves'])if(!SEEN.includes(task.experience[key]))fail(p+'.experience.'+key,'未注册的操作记录');}
 });
 const gates=new Set();
 data.gates.forEach((gate,i)=>{const p=`mainline.gates.${i}`;object(gate,p,['kind','index','task','label']);operation({type:'buy',kind:gate.kind,index:gate.index},p);text(gate.label,p+'.label');if(!ids.has(gate.task))fail(p+'.task','任务不存在');const key=gate.kind+':'+gate.index;if(gates.has(key))fail(p,'重复购买门槛');gates.add(key);});
}
// 正式启动、命令行和未来编辑器共同调用；候选不会修改正式对象。
export function validateContentConfig(data=CONTENT_DATA){
 object(data,'内容',['mainline','vehicles','monsters','growth']);mainline(data.mainline);
 const vehicles=data.vehicles;object(vehicles,'vehicles',['_说明','rows']);array(vehicles.rows,'vehicles.rows');
 const ids=vehicles.rows.map(v=>v.id),expected=COLLECTED_VEHICLES.map(v=>v.id);
 if(new Set(ids).size!==ids.length||ids.length!==expected.length||expected.some(id=>!ids.includes(id)))fail('vehicles.rows','必须一一对应已实现的战车型号 ID');
 vehicles.rows.forEach((row,i)=>{object(row,`vehicles.rows.${i}`,['id','baseHp','hpGrowth','speed']);for(const key of ['baseHp','hpGrowth','speed'])number(row[key],`vehicles.rows.${i}.${key}`,key==='hpGrowth'?0:Number.EPSILON);});
 const g=data.growth;object(g,'growth',['_说明','progress','parts','growth','masteryThresholds','masteryRewards','modCost','guardian']);
 array(g.masteryThresholds,'growth.masteryThresholds');g.masteryThresholds.forEach((n,i)=>{number(n,`growth.masteryThresholds.${i}`,0,true);if(i===0?n!==0:n<=g.masteryThresholds[i-1])fail('growth.masteryThresholds','必须从 0 开始严格递增');});
 numbers(g.modCost,'growth.modCost',['coins','wood']);numbers(g.guardian,'growth.guardian',['maxLevel','cost','ratePerLevel','magazinePerLevel','reloadPerLevel']);number(g.guardian.maxLevel,'growth.guardian.maxLevel',1,true);
 if(g.progress.modUnlockLevel>g.masteryThresholds.length)fail('growth.progress.modUnlockLevel','超过熟练度最高等级');
 const m=data.monsters;object(m,'monsters',['_说明','ranged','armored','flyingAttack','rangedLimits','rules','ranks']);object(m.ranged,'monsters.ranged',RANGED_IDS);
 for(const [id,row]of Object.entries(m.ranged)){numbers(row,'monsters.ranged.'+id,['reach','windup','recovery','speed','radius','range','damage'],['health','movement','unlock','mass','bodyRadius','splash'],Number.EPSILON);if(row.unlock!==undefined)number(row.unlock,'monsters.ranged.'+id+'.unlock',1,true);}
 object(m.armored,'monsters.armored',['id','name','health','speed','mass','damage','reward','radius','maxAlive','attack']);if(m.armored.id!=='ironwood-bulwark')fail('monsters.armored.id','物种机制未实现');text(m.armored.name,'monsters.armored.name');
 for(const key of ['health','speed','mass','damage','reward','radius','maxAlive'])number(m.armored[key],'monsters.armored.'+key,Number.EPSILON);
 number(m.armored.maxAlive,'monsters.armored.maxAlive',1,true);
 for(const [key,attack]of [['flyingAttack',m.flyingAttack],['armored.attack',m.armored.attack]])numbers(attack,'monsters.'+key,['reach','windup','lunge','returning','recovery','damage'],[],Number.EPSILON);
 numbers(m.rangedLimits,'monsters.rangedLimits',['alive','bolts','shotGap','bossShotGap'],[],Number.EPSILON);for(const key of ['alive','bolts'])number(m.rangedLimits[key],'monsters.rangedLimits.'+key,1,true);
 object(m.rules,'monsters.rules',['enemy','flying','ranged','armored']);object(m.ranks,'monsters.ranks',['enemyMassByRank','enemyHealthByRank','enemyDamageByRank']);
 // 复用已有字段范围和交叉约束，候选内容覆盖后再验证完整玩法参数。
 const values=structuredClone(GAMEPLAY_VALUES),tables=structuredClone(GAMEPLAY_TABLES);
 object(g.progress,'growth.progress',['startCoins','startWood','maxEquipmentLevel','modUnlockLevel','masteryDamagePerLevel','maxCoordinationLevel','maxPartLevel']);
 object(m.rules.enemy,'monsters.rules.enemy',['eliteRollThreshold','toughRollThreshold','zoneLevelSpan','healthPerLevel','baseHealth','baseDamage','damagePerLevel','baseSpeed','speedPerLevel','rankSpeedPenalty','baseReward','rewardPerZoneLevel','rewardPerRank']);
 values.progress={...g.progress,counterCap:values.progress.counterCap};values.parts=g.parts;values.growth=g.growth;
 values.guardian={...values.guardian,ratePerLevel:g.guardian.ratePerLevel,magazinePerLevel:g.guardian.magazinePerLevel,reloadPerLevel:g.guardian.reloadPerLevel};
 values.enemy={...values.enemy,...m.rules.enemy};for(const key of ['flying','ranged','armored'])values[key]=m.rules[key];
 tables.masteryRewards=g.masteryRewards;Object.assign(tables,m.ranks);validateGameplayConfig(values,tables);
 return true;
}

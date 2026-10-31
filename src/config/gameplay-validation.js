// 玩法配置合同：校验新键值与数据表，明确拒绝缺字段、未知字段、非法值和相互矛盾的规则。
import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { GAMEPLAY_TABLES } from './gameplay-tables.js';
import { GAMEPLAY_VALUE_SCHEMA, GAMEPLAY_TABLE_LABELS } from './gameplay-value-schema.js';

// 错误带稳定路径，数值工具可据此定位树节点。
function fail(path,message) { throw new Error(`玩法配置 ${path}：${message}`); }
// 只接受普通对象，禁止原型属性和可执行数据混入配置。
function object(value,path) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail(path,'必须是普通对象');
}
// 对象字段严格白名单；新增字段必须同时声明消费代码和配置合同。
function keys(value,expected,path) {
  object(value,path);
  for(const key of Object.keys(value))if(!expected.includes(key))fail(`${path}.${key}`,'未知字段');
  for(const key of expected)if(!Object.hasOwn(value,key))fail(`${path}.${key}`,'缺少字段');
}
// 数值必须有限；数量使用整数，时间和距离可以按规则允许小数。
function number(value,spec,path) {
  if(typeof value!=='number'||!Number.isFinite(value))fail(path,'必须是有限数值');
  if(spec.type==='integer'&&!Number.isSafeInteger(value))fail(path,'必须是安全整数');
  if(value<(spec.min??-Number.MAX_VALUE)||value>(spec.max??Number.MAX_SAFE_INTEGER))fail(path,'超出允许范围');
}
// 数组长度设置显式预算，防止危险区、弹丸和攻击条目无限增长。
function list(value,path,min,max) {
  if(!Array.isArray(value)||value.length<min||value.length>max)fail(path,`条目数必须在 ${min}–${max} 之间`);
}
// 数字列表共用类型与范围规则，不把排序索引误当成可编辑 ID。
function numericList(value,path,min,max,spec) {
  list(value,path,min,max);value.forEach((item,index)=>number(item,spec,`${path}.${index}`));
}
// 成组数据保留结构合同，角度与坐标允许负数，其余倍率或时长按用途限制。
export function validateGameplayTables(tables=GAMEPLAY_TABLES) {
  keys(tables,Object.keys(GAMEPLAY_TABLE_LABELS),'tables');
  keys(tables.masteryRewards,['tree','enemy','boss'],'tables.masteryRewards');
  for(const [key,value]of Object.entries(tables.masteryRewards))number(value,{type:'integer',min:0},`tables.masteryRewards.${key}`);
  keys(tables.enemyAttacks,['normal','tough'],'tables.enemyAttacks');
  for(const [key,row]of Object.entries(tables.enemyAttacks)) {
    keys(row,['reach','windup','lunge','returning','recovery','damage'],`tables.enemyAttacks.${key}`);
    for(const [field,value]of Object.entries(row))number(value,{min:field==='damage'?0:.000001},`tables.enemyAttacks.${key}.${field}`);
  }
  numericList(tables.featherAngles,'tables.featherAngles',1,64,{min:-Math.PI*2,max:Math.PI*2});
  list(tables.sporeOffsets,'tables.sporeOffsets',1,32);
  tables.sporeOffsets.forEach((row,index)=>numericList(row,`tables.sporeOffsets.${index}`,2,2,{min:-10000,max:10000}));
  for(const key of ['enemyMassByRank','enemyHealthByRank','enemyDamageByRank','enemyRadiusByRank'])numericList(tables[key],`tables.${key}`,3,3,{min:.000001});
  for(const key of ['waveRecoveryRelief','waveEarlyHealth'])numericList(tables[key],`tables.${key}`,0,1000,{min:.000001,max:1});
  object(tables.projectileProfiles,'tables.projectileProfiles');
  if(!Object.hasOwn(tables.projectileProfiles,'default'))fail('tables.projectileProfiles.default','缺少默认弹丸档位');
  for(const [id,row]of Object.entries(tables.projectileProfiles)) {
    if(!/^[a-z][a-z0-9-]*$/.test(id))fail(`tables.projectileProfiles.${id}`,'型号标识非法');
    keys(row,['drag','lift','gravity','groundBounces'],`tables.projectileProfiles.${id}`);
    for(const [key,value]of Object.entries(row))number(value,{min:0,...(key==='groundBounces'?{type:'integer',max:64}:{})},`tables.projectileProfiles.${id}.${key}`);
  }
  for(const key of ['environmentTimings','calendarTimings']) {
    keys(tables[key],key==='environmentTimings'?['season','day','dusk','night','weather']:['day','dusk','night','season'],`tables.${key}`);
    for(const [name,value]of Object.entries(tables[key]))number(value,{type:'integer',min:1},`tables.${key}.${name}`);
  }
  list(tables.dayPhases,'tables.dayPhases',3,3);
  for(const [index,row]of tables.dayPhases.entries()) {
    keys(row,['id'],`tables.dayPhases.${index}`);
    if(row.id!==['day','dusk','night'][index])fail(`tables.dayPhases.${index}.id`,'时段 ID 与顺序属于运行协议，不能直接修改');
  }
  return tables;
}
// 校验键值及跨字段约束，返回原对象供调用方保留引用身份。
export function validateGameplayConfig(values=GAMEPLAY_VALUES,tables=GAMEPLAY_TABLES) {
  const groups={};
  for(const path of Object.keys(GAMEPLAY_VALUE_SCHEMA)) { const [group,key]=path.split('.');(groups[group] ||= []).push(key); }
  keys(values,Object.keys(groups),'values');
  for(const [group,fields]of Object.entries(groups)) {
    keys(values[group],fields,`values.${group}`);
    for(const key of fields)number(values[group][key],GAMEPLAY_VALUE_SCHEMA[`${group}.${key}`],`values.${group}.${key}`);
  }
  validateGameplayTables(tables);
  // 这些关系影响除法、循环与选择，不能只检查单个字段的类型。
  if(values.enemy.toughRollThreshold>values.enemy.eliteRollThreshold)fail('values.enemy.eliteRollThreshold','精英阈值必须不低于强壮阈值');
  if(values.enemy.protectionMinRadius>values.enemy.protectionMaxRadius)fail('values.enemy.protectionMaxRadius','不得小于最小保护半径');
  if(values.ranged.ordinalRemainder>=values.ranged.every||values.ranged.every<1)fail('values.ranged.ordinalRemainder','余数必须小于配额周期');
  if(values.armored.ordinalRemainder>=values.armored.every||values.armored.every<1)fail('values.armored.ordinalRemainder','余数必须小于配额周期');
  if(values.blessings.offerCount>6)fail('values.blessings.offerCount','不能超过远征祝福池数量');
  if(values.fire.initialLitPerGroup>values.fire.treesPerGroup)fail('values.fire.initialLitPerGroup','不能超过每组树木数量');
  if(values.fire.minTrees<values.fire.groupCount*values.fire.treesPerGroup)fail('values.fire.minTrees','不能少于林区数量乘每组树木数');
  if(values.fire.emberMinOffset>values.fire.emberMaxOffset)fail('values.fire.emberMaxOffset','不能小于最小出生距离');
  if(values.realm.minSpacing>values.realm.firstSpacing)fail('values.realm.minSpacing','不能大于初始补兵间隔');
  if(values.wave.minInterval>values.wave.firstInterval)fail('values.wave.minInterval','不能大于初始补兵间隔');
  if(values.wave.firstBatch>values.wave.maxBatch)fail('values.wave.firstBatch','不能超过单批上限');
  if(values.realm.firstAlive>values.realm.maxAlive)fail('values.realm.firstAlive','不能超过同屏上限');
  if(values.growth.linearThroughLevel>values.progress.maxEquipmentLevel)fail('values.growth.linearThroughLevel','不能超过装备等级上限');
  if(values.parts.accuracyPerLevel*(values.progress.maxPartLevel-1)>1)fail('values.parts.accuracyPerLevel','满级散布不能变成负数');
  if(values.progress.maxCoordinationLevel+2>values.mechanical.capacity)fail('values.mechanical.capacity','槽位必须容纳最高协同等级的机械猫');
  if(values.environment.timingStepMs>values.environment.maxTimingMs)fail('values.environment.timingStepMs','不能超过环境最大时长');
  if(values.drone.goalRadius>values.drone.maxRadius)fail('values.drone.goalRadius','目标点不能超出无人机活动半径');
  if(values.flight.cruiseSpeed>values.flight.maxSpeed)fail('values.flight.cruiseSpeed','巡航限速不能超过实际速度上限');
  const calendarDay=tables.calendarTimings.day+tables.calendarTimings.dusk+tables.calendarTimings.night;
  if(tables.calendarTimings.season%calendarDay!==0)fail('tables.calendarTimings.season','季节必须包含整数个完整游戏日');
  for(const [id,time]of Object.entries(tables.environmentTimings))if(time<values.environment.timingStepMs||time>values.environment.maxTimingMs||time%values.environment.timingStepMs!==0)fail(`tables.environmentTimings.${id}`,'默认时长须在范围内且为时长步长的整数倍');
  return values;
}

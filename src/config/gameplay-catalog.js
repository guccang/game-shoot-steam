// 数值工具只读目录：汇总正式源表、可编辑键值、字段合同和仍需通过代码实现的规则入口。
import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { GAMEPLAY_TABLES } from './gameplay-tables.js';
import { GAMEPLAY_VALUE_SCHEMA, GAMEPLAY_TABLE_LABELS } from './gameplay-value-schema.js';
import { GAMEPLAY_CATALOG_SOURCES } from './gameplay-catalog-sources.js';
import { validateGameplayConfig } from './gameplay-validation.js';

// 配置快照不允许执行内容；省略可选的未定义字段，保留数组的槽位身份。
function plain(value,path,seen=new Set()) {
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error(`配置快照 ${path} 存在非有限数字`);return value;}
  if(typeof value!=='object')throw Error(`配置快照 ${path} 不是纯数据`);
  if(seen.has(value))throw Error(`配置快照 ${path} 存在循环引用`);
  seen.add(value);
  const result=Array.isArray(value)?value.map((v,i)=>plain(v,`${path}.${i}`,seen)):Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,plain(v,`${path}.${k}`,seen)]));
  seen.delete(value);return result;
}
// 字段路径始终由稳定标识和源字段组成，中文标签只用于展示。
function flatten(value,path,source,rows) {
  if(typeof value==='number') { rows.push({path,source,value});return; }
  if(value&&typeof value==='object')for(const [key,child]of Object.entries(value))flatten(child,`${path}.${key}`,source,rows);
}
// 按需载入既有配置，避免游戏启动为了工具目录导入全部故事与美术配置。
export async function loadGameplayCatalog() {
  validateGameplayConfig();
  const entries=[
    {id:'gameplay-values',label:'玩法键值',source:'src/config/gameplay-values.js',kind:'key-value',exports:{GAMEPLAY_VALUES:plain(GAMEPLAY_VALUES,'values')}},
    {id:'gameplay-tables',label:'玩法数据表',source:'src/config/gameplay-tables.js',kind:'tables',labels:plain(GAMEPLAY_TABLE_LABELS,'tableLabels'),exports:{GAMEPLAY_TABLES:plain(GAMEPLAY_TABLES,'tables')}},
  ];
  for(const source of GAMEPLAY_CATALOG_SOURCES) {
    const module=await import(source.module),data={},logicExports=[];
    for(const [name,value]of Object.entries(module)) {
      if(typeof value==='function'){logicExports.push(name);continue;}
      data[name]=plain(value,`${source.id}.${name}`);
    }
    entries.push({...source,kind:'existing-source',exports:data,logicExports});
  }
  const fields=[];
  for(const entry of entries)for(const [name,value]of Object.entries(entry.exports))flatten(value,`${entry.id}.${name}`,entry.source,fields);
  for(const row of fields)if(row.path.startsWith('gameplay-values.GAMEPLAY_VALUES.'))row.constraint=plain(GAMEPLAY_VALUE_SCHEMA[row.path.slice('gameplay-values.GAMEPLAY_VALUES.'.length)],`schema.${row.path}`);
  return {version:1,entries,fields,editing:'编辑 source 指向的正式源表；快照包含兼容导出和派生结果，不可整体回灌。键值表和玩法表可单独作为候选送入 validateGameplayConfig 校验。'};
}

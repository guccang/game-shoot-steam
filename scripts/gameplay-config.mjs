// 统一数值工具命令：校验正式配置、校验候选 JSON 或导出可查看的配置目录。
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadGameplayCatalog} from '../src/config/gameplay-catalog.js';
import {validateGameplayConfig} from '../src/config/gameplay-validation.js';
import {GAMEPLAY_VALUES} from '../src/config/gameplay-values.js';
import {GAMEPLAY_TABLES} from '../src/config/gameplay-tables.js';

const args=process.argv.slice(2),command=args[0]||'check';
// 读取有名称的路径参数，缺少值时明确报错，避免意外覆盖默认文件。
function argument(name) { const index=args.indexOf(name);if(index<0)return null;if(!args[index+1]||args[index+1].startsWith('--'))throw Error(`${name} 缺少路径`);return args[index+1]; }
if(command==='check') {
  const input=argument('--input');
  if(input) {
    const candidate=JSON.parse(await readFile(resolve(input),'utf8'));
    if(!candidate||Object.keys(candidate).sort().join(',')!=='tables,values')throw Error('候选必须且只能包含 values 和 tables');
    validateGameplayConfig(candidate.values,candidate.tables);
  } else validateGameplayConfig();
  const catalog=await loadGameplayCatalog();
  console.log(`玩法配置校验通过：${catalog.entries.length} 个来源，${catalog.fields.length} 个数值字段。`);
} else if(command==='export') {
  const output=argument('--output');if(!output)throw Error('导出必须指定 --output 路径');
  const data=args.includes('--candidate')?{values:GAMEPLAY_VALUES,tables:GAMEPLAY_TABLES}:await loadGameplayCatalog();
  validateGameplayConfig();
  await writeFile(resolve(output),JSON.stringify(data,null,2)+'\n');
  console.log(`已导出配置：${resolve(output)}`);
} else throw Error('支持的命令：check、export');

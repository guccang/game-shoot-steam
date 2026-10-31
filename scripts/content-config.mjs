// 内容表命令行：检查正式表或候选快照，导出仅包含游戏内容和成长的工具目录。
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {CONTENT_DATA,contentCatalog} from '../src/config/content-catalog.js';
import {validateContentConfig} from '../src/config/content-validation.js';
const args=process.argv.slice(2),command=args[0]||'check';
// 路径参数明确提供，避免隐式选择或覆盖其他配置文件。
function argument(key){const i=args.indexOf(key);if(i<0)return null;if(!args[i+1]||args[i+1].startsWith('--'))throw Error(key+' 缺少路径');return resolve(args[i+1]);}
if(command==='check'){
 const input=argument('--input');validateContentConfig(input?JSON.parse(await readFile(input,'utf8')):CONTENT_DATA);
 console.log('内容表校验通过：主线任务、战车、怪物、成长。');
}else if(command==='export'){
 const output=argument('--output');if(!output)throw Error('导出必须指定 --output 路径');validateContentConfig();
 await writeFile(output,JSON.stringify(args.includes('--candidate')?CONTENT_DATA:contentCatalog(),null,2)+'\n');console.log('已导出内容表：'+output);
}else throw Error('支持的命令：check、export');

// 玩法数值审计：扫描语法树中的数字和配置引用，字符串、注释和资源文件不参与匹配。
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';

const root=fileURLToPath(new URL('../',import.meta.url));
const layers=new Set(['core','combat','progression','physics','world','config','ui','balance','app','platform']);
// 递归收集源码，新增玩法文件会自动进入扫描范围。
async function collect(directory) {
  const entries=await readdir(directory,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?collect(resolve(directory,entry.name)):entry.name.endsWith('.js')?[resolve(directory,entry.name)]:[]))).flat();
}
// 遍历节点并保留祖先，便于区分数组索引、公式常量和真正的可调参数。
export function walk(node,visitor,ancestors=[]) {
  if(!node||typeof node.type!=='string')return;
  visitor(node,ancestors);
  for(const value of Object.values(node)) {
    if(Array.isArray(value))for(const child of value)walk(child,visitor,[...ancestors,node]);
    else if(value&&typeof value.type==='string')walk(value,visitor,[...ancestors,node]);
  }
}
// 输出候选而不将所有数字误判成可调项；数学常量和版本号保留审查上下文。
export async function auditGameplay(directory=root) {
  const rows=[],references=[];
  for(const absolute of (await collect(resolve(directory,'src'))).sort()) {
    const file=relative(directory,absolute).replaceAll('\\','/'),layer=file.split('/')[1];
    if(!layers.has(layer)||file.includes('gameplay-value-schema'))continue;
    const source=await readFile(absolute,'utf8'),lines=source.split(/\r?\n/),ast=parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});
    walk(ast,(node,ancestors)=>{
      if(node.type==='MemberExpression'&&node.object?.object?.name==='GAMEPLAY_VALUES'&&!node.computed)references.push({path:node.object.property.name+'.'+node.property.name,file,line:node.loc.start.line});
      if(node.type!=='Literal'||typeof node.value!=='number')return;
      const parent=ancestors.at(-1),fn=ancestors.findLast(n=>/Function/.test(n.type)||n.type==='MethodDefinition');
      let category=layer==='config'?'已有配置':'待复核';
      if(layer==='config'&&fn)category='配置内公式';
      if(layer!=='config'&&[0,1].includes(node.value))category='结构或默认值';
      if(parent?.type==='MemberExpression'&&parent.computed)category='索引';
      if(parent?.type==='Property'&&['version','healthVersion','cycleVersion','definitionVersion'].includes(parent.key?.name))category='版本';
      if(node.value>0&&node.value<=.001)category='精度或短间隔';
      rows.push({file,line:node.loc.start.line,column:node.loc.start.column+1,value:node.value,category,context:lines[node.loc.start.line-1].trim()});
    });
  }
  return {formatVersion:1,scope:[...layers],summary:Object.fromEntries([...new Set(rows.map(row=>row.category))].map(category=>[category,rows.filter(row=>row.category===category).length])),references,rows};
}
// 命令行输出可供数值工具直接读取的完整定位报告，报告不声称候选都属于玩法参数。
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=await auditGameplay(),index=process.argv.indexOf('--output');
  if(index>=0){if(!process.argv[index+1])throw Error('请提供审计输出路径');await writeFile(resolve(process.argv[index+1]),JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify(report.summary,null,2));
  console.log(`已记录 ${report.references.length} 处统一键值引用；待复核项含界面、物理和表现常量，需按设计含义判断。`);
}

// 全仓库模块迁移检查：解析源码、静态与动态导入、页面入口和未使用导入。
// 不执行游戏、不把历史分层约束误当作本轮迁移规则，补充原有专项检查入口。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
const root=fileURLToPath(new URL('../',import.meta.url)),failures=[];
// 只遍历正式源码、测试和工具，不扫描素材、存档、依赖或本机输出。
function collect(dir){return fs.readdirSync(path.join(root,dir),{recursive:true}).map(p=>dir+'/'+p.replaceAll('\\','/')).filter(p=>/\.(js|mjs|cjs)$/.test(p));}
// 结构化遍历避开注释和字符串，不把文案中的 import 当作真实依赖。
function walk(node,visit){if(!node||typeof node!=='object')return;if(node.type)visit(node);for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(n=>walk(n,visit));else if(value&&typeof value==='object')walk(value,visit);}}
// 支持模块相对路径及浏览器根路径；外部包和 URL 由各自运行环境解析。
function checkTarget(file,spec,mocks){if(typeof spec!=='string'||!spec.startsWith('.')&&!spec.startsWith('/src/'))return;const clean=spec.split(/[?#]/)[0];if(mocks.has(clean))return;const target=clean.startsWith('/src/')?path.join(root,clean.slice(1)):path.resolve(root,path.dirname(file),clean);if(!fs.existsSync(target))failures.push(`${file} → ${spec}`);}
const files=['src','tests','scripts'].flatMap(collect);let unused=0;
for(const file of files){const source=fs.readFileSync(path.join(root,file),'utf8');let ast;try{ast=parse(source,{ecmaVersion:'latest',sourceType:file.endsWith('.cjs')?'script':'module',allowReturnOutsideFunction:true});}catch(error){failures.push(`${file}：${error.message}`);continue;}
 const mocks=new Set();
 // 浏览器测试可显式拦截生成参考模块，只豁免本文件实际登记的完整路径。
 if(file.startsWith('tests/'))walk(ast,node=>{if(node.type==='CallExpression'&&node.callee?.property?.name==='route'&&node.arguments[0]?.type==='Literal'&&typeof node.arguments[0].value==='string')mocks.add(node.arguments[0].value.replace(/^\*\*/,''));});
 walk(ast,node=>{if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)&&node.source)checkTarget(file,node.source.value,mocks);if(node.type==='ImportExpression'&&node.source.type==='Literal')checkTarget(file,node.source.value,mocks);});
 if(file.startsWith('src/')){const used=new Set();for(const node of ast.body)if(node.type!=='ImportDeclaration')walk(node,n=>{if(n.type==='Identifier')used.add(n.name);});for(const node of ast.body)if(node.type==='ImportDeclaration')for(const spec of node.specifiers)if(!used.has(spec.local.name)){unused++;failures.push(`${file}：未使用导入 ${spec.local.name}`);}}
}
for(const file of fs.readdirSync(root).filter(p=>p.endsWith('.html'))){const source=fs.readFileSync(path.join(root,file),'utf8');for(const match of source.matchAll(/(?:src|href)=["']((?:\.\/|\/)?src\/[^"']+)["']/g)){const target=match[1].replace(/^\//,'');if(!fs.existsSync(path.join(root,target)))failures.push(`${file} → ${target}`);}}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`已检查 ${files.length} 个源码/测试/工具文件：语法、静态与动态模块路径、页面入口通过，未使用导入 ${unused} 个。`);

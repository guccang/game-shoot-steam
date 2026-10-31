// 显示边界审计：补充中文扫描，检查 DOM、Canvas、HTML 和 CSS 的直接显示文本。
import {parse} from 'acorn';
import {parse as parseHTML, parseFragment} from 'parse5';
const letters=/\p{Letter}/u;
const displayAttributes=new Set(['title','alt','placeholder','aria-label','aria-description','aria-valuetext']);
const displayProperties=new Set(['textContent','innerText',...displayAttributes]);
const displayFields=new Set(['name','label','title','description','text','hint','tooltip','subtitle']);

// 模板只保留静态部分；动态值用非字母标记，绝不把标识符当成译文。
function sketch(node){
  if(!node)return '';
  if(node.type==='Literal')return typeof node.value==='string'?node.value:'§';
  if(node.type==='TemplateLiteral')return node.quasis.map((q,i)=>q.value.cooked+(node.expressions[i]?sketch(node.expressions[i]):'')).join('');
  if(node.type==='BinaryExpression'&&node.operator==='+')return sketch(node.left)+sketch(node.right);
  if(node.type==='ConditionalExpression')return sketch(node.consequent)+'§'+sketch(node.alternate);
  if(node.type==='LogicalExpression')return sketch(node.left)+'§'+sketch(node.right);
  return '§';
}

// 检查 HTML 文字与无障碍属性，忽略脚本代码、样式和纯数字或装饰符号。
export function auditHTML(source,fragment=false){
  const issues=[];
  // 递归访问真实文本节点，避免把 SVG 路径、选择器和属性名误报为文案。
  function visit(node){
    if(node.nodeName==='script')return;
    if(node.nodeName==='style'){issues.push(...auditCSS((node.childNodes||[]).map(n=>n.value||'').join('')));return;}
    if(node.nodeName==='#text'&&letters.test(node.value))issues.push(node.value.trim());
    for(const attr of node.attrs||[]){
      if(displayAttributes.has(attr.name)&&letters.test(attr.value))issues.push(`${attr.name}: ${attr.value}`);
      if(attr.name==='style')issues.push(...auditCSS(attr.value));
    }
    for(const child of node.childNodes||[])visit(child);
    if(node.content)visit(node.content);
  }
  visit(fragment?parseFragment(source):parseHTML(source));return issues;
}

// 仅分析可确定的显示边界；计算得到的字符串仍需运行时语言切换验收。
export function auditJS(source){
  const issues=[],ast=parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});
  // 分支独立检查，翻译调用和动态数据不展开为代码文本。
  function display(node){
    if(!node)return;
    if(node.type==='ConditionalExpression'){display(node.consequent);display(node.alternate);return;}
    if(node.type==='LogicalExpression'){display(node.left);display(node.right);return;}
    const value=sketch(node);if(letters.test(value))issues.push({line:node.loc.start.line,text:value});
  }
  // 在最外层拼接处解析完整 HTML，避免半截标签被解析成显示文本。
  function visit(node,parent){
    if(!node||typeof node!=='object'||!node.type)return;
    if(node.type==='AssignmentExpression'&&displayProperties.has(node.left.property?.name||node.left.property?.value))display(node.right);
    if(node.type==='AssignmentExpression'&&['innerHTML','outerHTML'].includes(node.left.property?.name||node.left.property?.value))for(const text of auditHTML(sketch(node.right),true))issues.push({line:node.loc.start.line,text});
    if(node.type==='Property'&&displayFields.has(node.key.name||node.key.value))display(node.value);
    if(node.type==='CallExpression'){
      const method=node.callee.property?.name||node.callee.property?.value;
      if(['fillText','strokeText'].includes(method))display(node.arguments[0]);
      if(method==='setAttribute'&&displayAttributes.has(node.arguments[0]?.value))display(node.arguments[1]);
      if(method==='insertAdjacentHTML')for(const text of auditHTML(sketch(node.arguments[1]),true))issues.push({line:node.loc.start.line,text});
    }
    const composition=['Literal','TemplateLiteral','BinaryExpression'].includes(node.type);
    const withinComposition=parent&&(parent.type==='BinaryExpression'&&parent.operator==='+'||parent.type==='TemplateLiteral');
    if(composition&&!withinComposition){const value=sketch(node);if(/<\/?[a-z][\w-]*(?:\s|>)/i.test(value))for(const text of auditHTML(value,true))issues.push({line:node.loc.start.line,text});}
    for(const [key,value]of Object.entries(node))if(key!=='loc'){
      if(Array.isArray(value))for(const child of value)visit(child,node);
      else if(value&&typeof value==='object')visit(value,node);
    }
  }
  visit(ast);return issues;
}

// CSS 伪元素同样不能藏文案；解码转义后检查，空串、箭头和图标合法。
export function auditCSS(source){
  const issues=[];
  for(const declaration of source.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/\bcontent\s*:\s*([^;}]+)/gi)){
    for(const match of declaration[1].matchAll(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g)){
      const value=match[2].replace(/\\([0-9a-f]{1,6})\s?/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16))).replace(/\\(.)/gs,'$1');
      if(letters.test(value))issues.push(value);
    }
  }
  return issues;
}

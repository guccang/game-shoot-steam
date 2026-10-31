// 显示边界回归：英文、插值单位和转义 CSS 也必须经过语言表。
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditJS,auditHTML,auditCSS} from '../scripts/lib/i18n-visible-audit.mjs';

test('DOM、Canvas、配置描述与无障碍名称拒绝直接英文',()=>{
  for(const source of ["node.textContent = ready ? 'Boss' : i18nText('done');","ctx.fillText('Lv.' + level,0,0);","node.setAttribute('aria-label','Close');","const item={description:'Reload'};","node.innerText=`${count}s`;"])
    assert.ok(auditJS(source).length,source);
});
test('完整 HTML 模板和字符串拼接检查可见文字与嵌套分支',()=>{
  for(const source of ['node.innerHTML=`<small>P50</small>`;','node.innerHTML=`<b>${ready ? "Ready" : i18nText("wait")}</b>`;',`const markup='<button title="Open">'+name+'</button>';`])assert.ok(auditJS(source).length,source);
  assert.deepEqual(auditJS(`const markup='<svg><path d="M'+x+' 4" stroke="#c9d6be"/></svg>';`),[]);
  assert.ok(auditJS("node.innerHTML='Loading';").length);
  assert.ok(auditJS("node.insertAdjacentHTML('beforeend','Loading');").length);
});
test('HTML 文本、属性和 CSS content 支持英文、中文与转义审计',()=>{
  assert.equal(auditHTML('<p>Hello</p><img alt="图标">').length,2);
  assert.ok(auditHTML('<style>.x:after{content:"Loading"}</style>').length);
  for(const source of ['.x::after{content:"Loading"}',String.raw`.x:before{content:"\4e2d\6587"}`])assert.ok(auditCSS(source).length);
  assert.deepEqual(auditCSS('.x::after{content:"⌄"} .y{content:""}'),[]);
});
test('语言入口、路径、技术 ID、数字及装饰图形不误报',()=>{
  assert.deepEqual(auditJS(`const key='BOSS', path='/assets/a.png';node.textContent=i18nText('common.level',{p0:1});ctx.fillText(42,0,0);node.setAttribute('aria-controls','debug-content');`),[]);
  assert.deepEqual(auditHTML('<p><!--i18n:hello--></p><span>8+</span><button data-i18n-title="close">×</button><script>console.log("hello")</script>'),[]);
});

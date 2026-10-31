// 国际化行为验证：译文可重排、HTML 安全、缺项失败及配置先于玩法初始化。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatMessage, validateMessages, escapeTranslation } from '../src/i18n/format.js';
import { i18nText } from '../src/i18n/index.js';
import chinese from '../src/i18n/locales/zh-CN.json' with { type: 'json' };

test('参数可重排和重复，零值保留，参数中的花括号不再次插值', () => {
  assert.equal(formatMessage('{p1} / {p0} / {p1}', {p0:0,p1:'{p0}'}), '{p0} / 0 / {p0}');
  assert.equal(formatMessage('{companion}: {p0}', {p0:12}), '{companion}: 12');
  assert.throws(() => formatMessage('{p0}'), /Missing translation parameter/);
});

test('HTML 文案转义，原有受控图标片段保留', () => {
  assert.equal(formatMessage('A < B & "C" {p0}', {p0:'<b>12</b>'}, escapeTranslation), 'A &lt; B &amp; &quot;C&quot; <b>12</b>');
});

test('语言表缺项、额外键、错误占位符和标签明确失败', () => {
  const source={message:'{companion} · 第 {p0} 波'};
  assert.deepEqual(validateMessages({message:'Wave {p0}: {companion}'}, source, 'test'), {message:'Wave {p0}: {companion}'});
  for(const bad of [{},{message:''},{message:5},{message:'Wave {p1}'},{message:'<b>{p0}</b> {companion}'},{...source,extra:'x'}]) assert.throws(() => validateMessages(bad,source,'test'));
  assert.throws(() => i18nText('missing.key'), /Unknown translation key/);
});

test('只改 JSON 默认语言和译文，配置模块首次导入即使用新语言', async () => {
  const dir=await mkdtemp(join(tmpdir(),'forest-i18n-'));
  try {
    await cp(new URL('../src/i18n/',import.meta.url),join(dir,'i18n'),{recursive:true});
    await writeFile(join(dir,'package.json'),JSON.stringify({type:'module'}));
    const translated=Object.fromEntries(Object.entries(chinese).map(([key,text])=>[key,'TEST '+text]));
    translated['common.namedLevel']='Rank {p1}: {p0}';
    translated['common.secondsShort']='sec {p0}';
    translated['ui.resource.thousand']='KILO {p0}';
    await writeFile(join(dir,'i18n/locales/test.json'),JSON.stringify(translated));
    await writeFile(join(dir,'i18n/settings.json'),JSON.stringify({defaultLocale:'test',locales:{test:'./locales/test.json'}}));
    const config=await readFile(new URL('../src/config/heroes.js',import.meta.url),'utf8');
    await writeFile(join(dir,'heroes.js'),config.replace('../i18n/index.js','./i18n/index.js'));
    const {HEROES}=await import(pathToFileURL(join(dir,'heroes.js')));
    assert.equal(HEROES[0].name,'TEST 栗子');
    assert.equal(HEROES[0].id,'chestnut');
    const {i18nText:translatedText}=await import(pathToFileURL(join(dir,'i18n/index.js')));
    assert.equal(translatedText('common.namedLevel',{p0:'Cat',p1:3}),'Rank 3: Cat');
    assert.equal(translatedText('common.secondsShort',{p0:'1.5'}),'sec 1.5');
    const resource=await readFile(new URL('../src/ui/resource-number.js',import.meta.url),'utf8');
    await cp(new URL('../src/config/resource-limits.js',import.meta.url),join(dir,'resource-limits.js'));
    await writeFile(join(dir,'resource-number.js'),resource.replace('../i18n/index.js','./i18n/index.js').replace('../config/resource-limits.js','./resource-limits.js'));
    const {compactResource}=await import(pathToFileURL(join(dir,'resource-number.js')));
    assert.equal(compactResource(1999),'1999');assert.equal(compactResource(999),'999');
  } finally { await rm(dir,{recursive:true,force:true}); }
});

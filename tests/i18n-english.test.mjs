// 正式英文包校验：覆盖完整译文、实际初始化与语言切换后的稳定标识。
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import chinese from '../src/i18n/locales/zh-CN.json' with { type: 'json' };
import english from '../src/i18n/locales/en-US.json' with { type: 'json' };
import settings from '../src/i18n/settings.json' with { type: 'json' };
import { validateMessages, formatMessage } from '../src/i18n/format.js';

test('正式英文包完整注册，键与占位符一致且无中文残留', () => {
  assert.equal(settings.defaultLocale, 'zh-CN');
  assert.equal(settings.locales['en-US'], './locales/en-US.json');
  validateMessages(english, chinese, 'en-US');
  for (const [key, value] of Object.entries(english)) {
    assert.doesNotMatch(value, /\p{Script=Han}/u, key);
    const params = Object.fromEntries([...value.matchAll(/\{(p\d+)\}/g)].map(([, name]) => [name, '12']));
    assert.doesNotMatch(formatMessage(value, params), /\{p\d+\}/, key);
  }
});

test('正式英文配置先于游戏初始化，数值单位和稳定 ID 保持原义', () => {
  // 新进程模拟真实 URL，避免同一进程的模块缓存掩盖语言初始化问题。
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
    globalThis.location = {search:'?lang=en-US'};
    const {locale,i18nText} = await import('./src/i18n/index.js');
    const {HEROES} = await import('./src/config/heroes.js');
    const {WEAPONS} = await import('./src/config/weapons.js');
    const {COLLECTED_VEHICLES} = await import('./src/config/vehicles.js');
    const {compactResource} = await import('./src/ui/resource-number.js');
    console.log(JSON.stringify({locale, hero:HEROES[0].name,heroId:HEROES[0].id,
      weapon:WEAPONS[0].name,vehicleId:COLLECTED_VEHICLES[0].id,
      units:[999,1000,10000,100000000].map(compactResource),
      stage:i18nText('ui.panels.realms.309dd58b3f',{p0:3,p1:'Wave'})}));
  `], {cwd:new URL('..',import.meta.url), encoding:'utf8'}));
  assert.deepEqual(result, {locale:'en-US',hero:'Chestnut',heroId:'chestnut',
    weapon:'Pinecone Pistol',vehicleId:'pine-tank',units:['999','1000','1×10K','9999×10K'],
    stage:'Endless Challenge · Wave 3'});
});

// 公共转义与确定性噪声的行为回归，防止去重改变空值、实体或地貌种子。
import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml,escapeOptionalHtml} from '../src/ui/shared/html.js';
import {escapeStoryText} from '../src/ui/story-icons.js';
import {terrainNoise} from '../src/world/terrain-noise.js';
import {terrainNoise as forestNoise} from '../src/world/biomes.js';
import {valleyNoise} from '../src/world/jiuzhaigou.js';
import {warehouseNotice} from '../src/core/inventory/warehouse-notice.js';

test('动态文本只转义一次，并保留普通值与可选文案的空值区别',()=>{
 assert.equal(escapeHtml(`<img title="猫猫" onerror='x'>&`),'&lt;img title=&quot;猫猫&quot; onerror=&#39;x&#39;&gt;&amp;');
 assert.equal(escapeHtml('&amp;'),'&amp;amp;');assert.equal(escapeHtml(null),'null');assert.equal(escapeHtml(undefined),'undefined');
 assert.equal(escapeOptionalHtml(null),'');assert.equal(escapeOptionalHtml(undefined),'');assert.equal(escapeOptionalHtml(0),'0');assert.equal(escapeOptionalHtml(false),'false');assert.equal(escapeStoryText,escapeOptionalHtml);
});
test('森林与湖谷继续读取同一个原噪声公式，跨镜像与小数坐标结果不变',()=>{
 assert.equal(forestNoise,terrainNoise);assert.equal(valleyNoise,terrainNoise);
 for(const x of [-48000,-3.5,0,1,900,48000])for(const y of [-36000,-.1,0,700,36000]){const n=Math.sin(x*12.9898+y*78.233)*43758.5453;assert.equal(terrainNoise(x,y),n-Math.floor(n));}
});
test('仓库不同收货事务独立去重，原因变化后可以再次提示',()=>{
 const messages=[],g={player:{x:100,y:200},float:(...args)=>messages.push(args)},wood={notice:''},harvest={notice:''};
 warehouseNotice(g,wood,'已满');warehouseNotice(g,wood,'已满');warehouseNotice(g,harvest,'已满');warehouseNotice(g,wood,'保存失败');
 assert.deepEqual(messages,[[100,155,'已满','#f5d9a0'],[100,155,'已满','#f5d9a0'],[100,155,'保存失败','#f5d9a0']]);
});

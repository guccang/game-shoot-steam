// 风格模块的边界与缓存释放测试，不推进游戏、不写用户存档。
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {artStyle,commitArtStyle} from '../src/art-styles/state.js';
import {outline,poly} from '../src/rendering/primitives.js';
import {releaseArtCache} from '../src/art-styles/cache.js';
import {ART_PROFILES,style} from '../src/art-styles/config.js';
test('切换公共图元时实时更新描边，调用参数与路径保持不变',()=>{
 const previous=artStyle(),paths=[],strokes=[],c={beginPath(){},moveTo(x,y){paths.push([x,y]);},lineTo(x,y){paths.push([x,y]);},closePath(){},fill(){},stroke(){strokes.push([this.strokeStyle,this.lineWidth]);}};
 try{commitArtStyle('classic');assert.equal(outline,'#3b5742');poly(c,[[1,2],[3,4],[5,6]],'#abc');commitArtStyle('clear');assert.equal(outline,'#59402e');poly(c,[[1,2],[3,4],[5,6]],'#abc');assert.deepEqual(paths.slice(0,3),paths.slice(3));assert.deepEqual(strokes,[['#3b5742',2.5],['#59402e',3]]);assert.throws(()=>commitArtStyle('missing'));assert.equal(artStyle(),'clear');}finally{commitArtStyle(previous);}
});
test('旧图集递归释放且去重，切换后不保留纹理集合',()=>{
 const canvas={width:300,height:200,getContext(){}},map=new Map([['first',{day:canvas,night:canvas}]]);releaseArtCache(map);assert.equal(map.size,0);assert.equal(canvas.width,1);assert.equal(canvas.height,1);
});
test('公共美术接口共用一个实现，两套风格目录只含配置数据',async()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../src/art-styles/manifest.json',import.meta.url)));
 for(const file of manifest.modules){const shared=await import('../src/rendering/'+file);assert.deepEqual(Object.keys(shared).sort(),manifest.exports[file],file+'不能改变调用接口');}
 // 防止拼错配置键后Canvas静默沿用上一次颜色，逐项检查正式绘制器的引用。
 for(const file of manifest.modules){const code=fs.readFileSync(new URL('../src/rendering/'+file,import.meta.url),'utf8');for(const [,group,key]of code.matchAll(/style\.([A-Za-z]+)\.([A-Za-z0-9_]+)/g))for(const id of ['classic','clear'])assert.ok(Object.hasOwn(ART_PROFILES[id][group]||{},key),`${file}缺少${id}.${group}.${key}`);}
 for(const id of ['classic','clear'])assert.deepEqual(fs.readdirSync(new URL('../src/art-styles/'+id+'/',import.meta.url)),['profile.json']);
});
test('配置结构一致且不可变，切换更新实时绑定而不更换函数',()=>{
 // 允许色阶数量和纹理点位不同，字段名称与数据类型须保持一致。
 function shape(value){if(Array.isArray(value))return 'array';if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,shape(value[key])]));return typeof value;}
 assert.deepEqual(shape(ART_PROFILES.classic),shape(ART_PROFILES.clear));
 assert.ok(Object.isFrozen(ART_PROFILES.clear.pineWheels));assert.throws(()=>{ART_PROFILES.clear.primitives.outline='#000';});
 const previous=artStyle(),draw=poly;
 try{for(const id of ['classic','clear','classic']){commitArtStyle(id);assert.equal(style,ART_PROFILES[id]);assert.equal(poly,draw);assert.equal(outline,style.primitives.outline);}}finally{commitArtStyle(previous);}
});
test('两套小屋图片尺寸、锚点与文件清单一致',()=>{
 for(const style of ['classic','clear']){const base=new URL('../assets/art-styles/'+style+'/cozy-cottage/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',base))),png=fs.readFileSync(new URL('cottage.png',base));assert.equal(png.readUInt32BE(16),360);assert.equal(png.readUInt32BE(20),328);assert.deepEqual(manifest.logicalBounds,[-90,-148,180,164]);assert.ok(JSON.stringify(manifest).includes(crypto.createHash('sha256').update(png).digest('hex')));}
});

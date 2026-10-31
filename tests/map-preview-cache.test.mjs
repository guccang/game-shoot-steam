// 异步地图缓存：覆盖重复开图、换季竞态、释放和失败重试，另检查交付资源指纹。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MapPreviewCache, MAP_PREVIEW_VERSION } from '../src/rendering/map-preview-cache.js';
import { GroundCache } from '../src/rendering/ground-cache.js';

// 可控制完成顺序的网络替身，检查取消后返回的图像也被释放。
function fixture() {
  const requests=[];
  const cache=new MapPreviewCache({load:(options,signal)=>new Promise((resolve,reject)=>requests.push({options,signal,resolve,reject}))});
  return {cache,requests};
}
// 假位图保留像素尺寸和释放标志，避免依赖浏览器运行单元测试。
function bitmap(){return {width:720,height:560,closed:false,close(){this.closed=true;}};}
// 排空成功与失败回调，不用不稳定的实际网络计时。
async function settle(){await Promise.resolve();await Promise.resolve();}

test('点击只异步请求，完整加载前不绘制；重复开图复用同一张解码图',async()=>{
  const f=fixture(),draws=[],c={drawImage:(...args)=>draws.push(args)};
  assert.equal(f.cache.draw(c,720,560,{season:'spring'}),false);
  f.cache.request(720,560,{season:'spring'});assert.equal(f.requests.length,1);assert.equal(draws.length,0);
  const image=bitmap();f.requests[0].resolve(image);await settle();
  assert.equal(f.cache.advance(),true);assert.equal(f.cache.advance(),false);
  for(let i=0;i<10;i++)assert.equal(f.cache.draw(c,720,560,{season:'spring'}),true);
  assert.equal(f.requests.length,1);assert.equal(draws[0][0],image);assert.equal(f.cache.stats().bytes,720*560*4);
});

test('湖谷忽略森林季节，超过两张时释放最旧图，绘制尺寸变化不重复解码',async()=>{
  const f=fixture();f.cache.request(720,560,{mapId:'jiuzhaigou',season:'spring'});
  const valley=bitmap();f.requests[0].resolve(valley);await settle();
  assert.equal(f.cache.request(360,280,{mapId:'jiuzhaigou',season:'winter'}),valley);
  f.cache.request(720,560,{season:'summer'});f.requests[1].resolve(bitmap());await settle();
  f.cache.request(720,560,{season:'winter'});f.requests[2].resolve(bitmap());await settle();
  assert.equal(valley.closed,true);assert.equal(f.cache.stats().count,2);
});

test('换季取消旧请求，迟到结果不覆盖新图，销毁后迟到图像也释放',async()=>{
  const f=fixture();f.cache.request(720,560,{season:'summer'});f.cache.request(720,560,{season:'winter'});
  assert.equal(f.requests[0].signal.aborted,true);
  const old=bitmap(),current=bitmap();f.requests[0].resolve(old);f.requests[1].resolve(current);await settle();
  assert.equal(old.closed,true);assert.equal(f.cache.stats().builds,1);
  assert.equal(f.cache.request(720,560,{season:'winter'}),current);
  f.cache.request(720,560,{season:'spring'});f.cache.dispose();const late=bitmap();f.requests[2].resolve(late);await settle();
  assert.equal(current.closed,true);assert.equal(late.closed,true);assert.equal(f.cache.stats().bytes,0);
});

test('失败明确报告且不逐帧重试，重新打开后可恢复；旧失败不影响新请求',async()=>{
  const f=fixture();f.cache.request(720,560);f.requests[0].reject(Error('资源缺失'));await settle();
  assert.equal(f.cache.stats().error,'资源缺失');assert.equal(f.cache.advance(),true);
  for(let i=0;i<10;i++)f.cache.request(720,560);assert.equal(f.requests.length,1);
  f.cache.request(720,560,{retry:true});assert.equal(f.requests.length,2);assert.equal(f.cache.stats().error,null);
  f.cache.request(720,560,{season:'spring'});f.requests[1].reject(Error('旧失败'));await settle();
  assert.equal(f.cache.stats().error,null);f.requests[2].resolve(bitmap());await settle();assert.equal(f.cache.stats().count,1);
});

test('总览参数不会更改战场季节过渡、地块、地图及预热队列',async()=>{
  const ground=new GroundCache(),f=fixture();ground.mapPreview=f.cache;
  ground.season='spring';ground.transition={revision:4,active:true,progress:.3};
  const transition=ground.transition,tile={day:{width:388,height:388}},queue=[{key:'next'}];
  ground.tiles.set('0:0',tile);ground.pending=queue;
  const c={drawImage(){}};ground.drawMap(c,720,560,{mapId:'jiuzhaigou',season:'winter'});
  f.requests[0].resolve(bitmap());await settle();assert.equal(ground.drawMap(c,720,560,{mapId:'jiuzhaigou'}),true);
  assert.equal(ground.mapId,'forest');assert.equal(ground.season,'spring');assert.equal(ground.transition,transition);
  assert.equal(ground.tiles.get('0:0'),tile);assert.equal(ground.pending,queue);ground.dispose();assert.equal(f.cache.stats().bytes,0);
});

test('两套风格各五张运行图尺寸、哈希、版本及绘制依赖保持一致',async()=>{
 for(const style of ['classic','clear']){
  const base='../assets/art-styles/'+style+'/map-preview/';
  const manifest=JSON.parse(await readFile(new URL(base+'manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,MAP_PREVIEW_VERSION);assert.equal(manifest.files.length,5);
  // 文本统一换行后取指纹，避免Windows和其他构建平台误报差异。
  const hash=data=>createHash('sha256').update(data).digest('hex');
  for(const [path,expected] of Object.entries(manifest.sources)){
    const data=await readFile(new URL('../'+path,import.meta.url),'utf8');assert.equal(hash(data.replaceAll('\r\n','\n')),expected,'需重新生成底图：'+path);
  }
  for(const file of manifest.files){
    const data=await readFile(new URL(base+file.file,import.meta.url));
    assert.equal(data.length,file.bytes);assert.equal(hash(data),file.sha256);assert.equal(data.readUInt32BE(16),720);assert.equal(data.readUInt32BE(20),560);
  }
 }
});

// 静态缓存只验证预算、调度与生命周期，不用虚拟画布冒充视觉验收。
import test from 'node:test';
import assert from 'node:assert/strict';
import {StaticRasterCache} from '../src/rendering/static-raster-cache.js';
// 保留已分配画布，核对淘汰和异常路径确实释放像素。
function fixture(options={}){
 const surfaces=[],draws=[];let revision=0,style='clear',time=0,paints=0;
 const cache=new StaticRasterCache({...options,create:()=>{const c={scale(){},translate(){},isContextLost:()=>false},canvas={width:0,height:0,getContext:()=>c};surfaces.push(canvas);return canvas;},now:()=>++time,revision:()=>revision,style:()=>style});
 return {cache,surfaces,draws,c:{drawImage:(...args)=>draws.push(args)},paint:()=>paints++,paints:()=>paints,restore:()=>revision++,switchStyle:()=>style='classic'};
}
test('同帧多个缺失合并队列，每次预热只生成一项，命中不重画源内容',()=>{
 const f=fixture(),b=[-10,-15,20,20];for(let i=0;i<3;i++)f.cache.draw(f.c,'甲',b,f.paint);f.cache.draw(f.c,'乙',b,f.paint);
 assert.equal(f.cache.stats().pending,2);assert.equal(f.cache.advance(),1);assert.equal(f.cache.stats().pending,1);assert.equal(f.paints(),5);
 f.cache.draw(f.c,'甲',b,f.paint);assert.equal(f.paints(),5);assert.deepEqual(f.draws[0].slice(1),b);assert.equal(f.cache.stats().bytes,6400);
});
test('字节上限按最近使用淘汰并释放像素，队列有界',()=>{
 const f=fixture({maxBytes:128,maxEntryBytes:128,maxPending:2}),b=[0,0,2,2];for(const key of ['甲','乙','丙'])f.cache.draw(f.c,key,b,f.paint);
 assert.equal(f.cache.stats().pending,2);f.cache.advance();f.cache.advance();f.cache.draw(f.c,'甲',b,f.paint);f.cache.draw(f.c,'丙',b,f.paint);f.cache.advance();
 assert.equal(f.surfaces[1].width,1);assert.equal(f.cache.entries.has('甲'),true);assert.equal(f.cache.entries.has('乙'),false);assert.equal(f.cache.stats().bytes,128);assert.equal(f.cache.stats().evictions,1);
});
test('风格变化与上下文恢复同时清除待办和已生成像素',()=>{
 for(const invalidate of ['switchStyle','restore']){const f=fixture(),b=[0,0,2,2];f.cache.draw(f.c,'甲',b,f.paint);f.cache.advance();f.cache.draw(f.c,'乙',b,f.paint);f[invalidate]();assert.equal(f.cache.advance(),0);assert.equal(f.surfaces[0].height,1);assert.equal(f.cache.stats().bytes,0);assert.equal(f.cache.stats().pending,0);}
});
test('失败明确抛错并释放临时画布，之后可重新排队',()=>{
 const f=fixture(),b=[0,0,2,2];let fail=false;const paint=()=>{if(fail)throw Error('画笔失败');};f.cache.draw(f.c,'甲',b,paint);fail=true;assert.throws(()=>f.cache.advance(),/画笔失败/);assert.equal(f.surfaces[0].width,1);assert.equal(f.cache.stats().count,0);fail=false;f.cache.draw(f.c,'甲',b,paint);f.cache.advance();assert.equal(f.cache.stats().count,1);
});

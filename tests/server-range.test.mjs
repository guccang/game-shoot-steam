// 启动真实静态服务验证iOS媒体分段协议；随机测试端口不影响4175游戏预览。
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);

test('视频服务支持Safari分段读取，保留全文和HEAD响应',{timeout:20000},async t=>{
  const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:'0'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  t.after(async()=>{if(child.exitCode===null){const closed=once(child,'exit');child.kill();await closed;}});
  // 等待服务报告实际监听端口，不通过固定等待猜测是否启动。
  const address=await new Promise((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>reject(Error('静态服务启动超时')),10000);
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);reject(Error('静态服务提前退出：'+code));});
    child.stdout.on('data',chunk=>{output+=chunk;const url=output.match(/http:\/\/localhost:\d+/)?.[0];if(url){clearTimeout(timer);resolve(url.replace('localhost','127.0.0.1'));}});
  });
  const video=await readFile(new URL('assets/title/background.mp4',root)),url=address+'/assets/title/background.mp4';
  await t.test('iOS前两个字节探测返回206及准确正文',async()=>{
    const r=await fetch(url,{headers:{Range:'bytes=0-1'}});
    assert.equal(r.status,206);assert.equal(r.headers.get('content-type'),'video/mp4');
    assert.equal(r.headers.get('accept-ranges'),'bytes');assert.equal(r.headers.get('content-range'),`bytes 0-1/${video.length}`);
    assert.equal(r.headers.get('content-length'),'2');assert.deepEqual(Buffer.from(await r.arrayBuffer()),video.subarray(0,2));
  });
  await t.test('连续分片能重组原视频，支持开放末尾和后缀',async()=>{
    const parts=[];
    for(const range of ['bytes=0-99','bytes=100-']){
      const r=await fetch(url,{headers:{Range:range}});assert.equal(r.status,206);parts.push(Buffer.from(await r.arrayBuffer()));
    }
    assert.deepEqual(Buffer.concat(parts),video);
    for(const [range,start] of [['bytes=-32',video.length-32],['bytes=-99999999999999999999',0],[`bytes=${video.length-5}-99999999999999999999`,video.length-5]]){
      const r=await fetch(url,{headers:{Range:range}});assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),video.subarray(start));
    }
  });
  await t.test('越界返回416和资源总长度',async()=>{
    for(const range of [`bytes=${video.length}-`,'bytes=-0','bytes=999999999999999999999-']){
      const r=await fetch(url,{headers:{Range:range}});assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),`bytes */${video.length}`);assert.equal((await r.arrayBuffer()).byteLength,0);
    }
  });
  await t.test('全文、无效或多段以及过期If-Range均保持完整200',async()=>{
    for(const headers of [{},{Range:'bytes=bad'},{Range:'bytes=9-2'},{Range:'bytes=0-1,4-5'},{Range:'items=0-1'},{Range:'bytes=0-1','If-Range':'"old-version"'}]){
      const r=await fetch(url,{headers});assert.equal(r.status,200);assert.equal(r.headers.get('content-length'),String(video.length));assert.equal(r.headers.get('content-range'),null);assert.deepEqual(Buffer.from(await r.arrayBuffer()),video);
    }
  });
  await t.test('HEAD无正文且忽略Range，文本类型与缺失响应正常',async()=>{
    const r=await fetch(url,{method:'HEAD',headers:{Range:'bytes=0-1'}});
    assert.equal(r.status,200);assert.equal(r.headers.get('content-length'),String(video.length));assert.equal(r.headers.get('content-range'),null);assert.equal((await r.arrayBuffer()).byteLength,0);
    const html=await fetch(address+'/');assert.match(html.headers.get('content-type'),/^text\/html; charset=utf-8$/);assert.match(await html.text(),/title-video/);
    const missing=await fetch(address+'/assets/title/missing.mp4',{headers:{Range:'bytes=0-1'}});assert.equal(missing.status,404);
  });
});

// 精修图集资源合同：十五个身份齐全、真实RGBA尺寸、来源可追溯且预算有界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../assets/biome-dumplings/manifest.json' with {type:'json'};
import {BIOME_DUMPLINGS} from '../src/config/biome-dumplings.js';
const root=new URL('../assets/biome-dumplings/',import.meta.url);

test('十五张PNG身份完整、像素尺寸与RGBA透明通道正确，资源预算不超标',()=>{
 assert.deepEqual(Object.keys(manifest.entries).sort(),BIOME_DUMPLINGS.map(p=>p.id).sort());let bytes=0;const hashes=new Set();
 for(const [id,e] of Object.entries(manifest.entries)){
  const png=readFileSync(new URL(e.file,root));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);assert.equal(png[25],6,id+'必须为RGBA');assert.equal(png.length,e.bytes);bytes+=png.length;hashes.add(createHash('sha256').update(png).digest('hex'));
  assert.equal(createHash('sha256').update(readFileSync(new URL('source/'+id+'.png',root))).digest('hex'),e.sourceSha256);
 }
 assert.equal(hashes.size,15);assert.ok(bytes<3*1024*1024);assert.equal(15*512*512*4,15728640);
});

test('部件矩形留有透明安全边，不串格，水团左右鳍与藤鞭独立',()=>{
 for(const [id,e] of Object.entries(manifest.entries)){
  assert.ok(e.parts.body);if(id!=='vine')assert.ok(e.parts.crown);
  for(const [i,key] of ['body','crown','left','right'].entries()){
   const r=e.parts[key];if(!r)continue;const [x,y,w,h]=r;
   assert.ok(x>=i%2*256+8&&y>=Math.floor(i/2)*256+8);assert.ok(x+w<=(i%2+1)*256-8&&y+h<=(Math.floor(i/2)+1)*256-8);assert.ok(w>0&&h>0);
  }
 }
 for(const id of ['lotus','bubble','whirlpool','vine']){assert.ok(manifest.entries[id].parts.left);assert.ok(manifest.entries[id].parts.right);}
 assert.equal(manifest.entries.vine.parts.crown,null);
});

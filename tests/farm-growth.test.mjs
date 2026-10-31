// 作物生长表现回归：阶段连续、固定根部、减少动态与一次性特效不影响真实成长。
import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleCropGrowth,cropBend,drawGrowingCrop,cropGrowthBoosts} from '../src/rendering/farm-growth.js';
const plot={id:3,crop:0,plantedAt:100000,readyAt:160000};

test('萌芽与成熟连续换接且透明度总和为一，阶段尺寸不超过原上限',()=>{
 for(let now=100000;now<=161000;now+=50){const v=sampleCropGrowth(plot,now,4);assert.ok(Math.abs(v.layers.reduce((n,l)=>n+l.alpha,0)-1)<1e-9);for(const layer of v.layers)assert.ok(layer.scale>0&&layer.scale<=1);}
 for(const boundary of [114300,115700,158600,160000]){
  const a=sampleCropGrowth(plot,boundary-.01),b=sampleCropGrowth(plot,boundary+.01);
  for(let stage=0;stage<3;stage++)assert.ok(Math.abs((a.layers.find(l=>l.stage===stage)?.alpha||0)-(b.layers.find(l=>l.stage===stage)?.alpha||0))<.001);
 }
 assert.deepEqual(sampleCropGrowth(plot,170000).layers,[{stage:2,alpha:1,scale:1}]);
});

test('根部固定，叶尖错相轻摆，减少动态关闭局部运动与颗粒',()=>{
 const a=sampleCropGrowth(plot,140000,1),b=sampleCropGrowth(plot,140000,2),neighbor=sampleCropGrowth({...plot,id:4},140000,1);
 assert.equal(cropBend(0,a),0);assert.notEqual(cropBend(1,a),cropBend(1,b));assert.notEqual(cropBend(1,a),cropBend(1,neighbor));
 const quiet=sampleCropGrowth(plot,160300,2,true);assert.equal(cropBend(1,quiet),0);assert.equal(quiet.shine,-1);assert.equal(quiet.soil,-1);
});

test('萌芽和成熟提示过期后不补播，采样不改存档与成熟条件',()=>{
 const copy={...plot};assert.equal(sampleCropGrowth(plot,159999).growth<1,true);assert.equal(sampleCropGrowth(plot,160000).growth,1);
 assert.ok(sampleCropGrowth(plot,160400).shine>0&&sampleCropGrowth(plot,160400).shine<1);
 assert.ok(sampleCropGrowth(plot,170000).shine>1);assert.deepEqual(plot,copy);
});

test('小作物三切片、放大六切片，底边严格贴根且减少动态只绘一次',()=>{
 const transforms=[],draws=[],c={save(){},restore(){},transform(...args){transforms.push(args);},drawImage(...args){draws.push(args);}};
 for(const zoom of [1,2]){
  draws.length=0;transforms.length=0;drawGrowingCrop(c,{},[10,20,80,120],100,205,40,60,sampleCropGrowth(plot,140000,2),1,zoom);
  const bands=zoom===1?3:6,dh=60/bands;assert.equal(draws.length,bands);
  for(let i=0;i<bands-1;i++){const t=transforms[i],next=transforms[i+1];assert.ok(Math.abs(t[4]+t[2]*dh-next[4])<1e-9);}
  const last=transforms[bands-1];assert.ok(Math.abs(last[4]+last[2]*dh-80)<1e-9);assert.equal(last[5]+dh,205);
 }
 draws.length=0;drawGrowingCrop(c,{},[10,20,80,120],100,205,40,60,sampleCropGrowth(plot,140000,2,true),1);assert.equal(draws.length,1);
});

test('三切片与连续曲线偏差小于0.07世界像素，72株只需216次图像绘制',()=>{
 for(let time=0;time<8;time+=.2)for(let phase=0;phase<6.3;phase+=.4)for(let h=0;h<=1;h+=.02){
  const visual={time,phase},i=Math.min(2,Math.floor(h*3)),t=h*3-i,a=cropBend(i/3,visual),b=cropBend((i+1)/3,visual);
  assert.ok(Math.abs(a+(b-a)*t-cropBend(h,visual))<.07);
 }
 let draws=0;const c={save(){},restore(){},transform(){},drawImage(){draws++;}};
 for(let id=0;id<72;id++)drawGrowingCrop(c,{},[10,20,80,120],100,205,40,60,sampleCropGrowth({...plot,id},170000,2),2,.9);
 assert.equal(draws,216);
});

test('浇水跨阶段也连续成长，收割条件立即生效，单田短过渡结束后释放',()=>{
 const state={},plots=Array.from({length:5},(_,id)=>({...plot,id,readyAt:150000})),game={mapId:'forest',farmWork:{},progress:{farm:{plots}}};
 cropGrowthBoosts(state,game,10);game.farmWork.result={ok:true,action:'water',wateredPlots:plots.map(p=>({id:p.id,savedSeconds:10}))};
 const boosts=cropGrowthBoosts(state,game,10);assert.equal(boosts.length,1);
 const start=sampleCropGrowth(plots[0],150000,10,false,boosts[0]),before=sampleCropGrowth({...plots[0],readyAt:160000},150000,10);
 assert.deepEqual(start.layers,before.layers);assert.equal(start.growth,1);
 assert.deepEqual(sampleCropGrowth(plots[0],150000,10.8,false,boosts[0]).layers,[{stage:2,alpha:1,scale:1}]);
 assert.equal(cropGrowthBoosts(state,game,10.4)[0].start,10);assert.equal(cropGrowthBoosts(state,game,10.81).length,0);assert.equal(cropGrowthBoosts(state,game,11).length,0);
 game.farmWork.result={...game.farmWork.result};assert.equal(cropGrowthBoosts(state,game,12).length,1);game.mapId='jiuzhaigou';assert.equal(cropGrowthBoosts(state,game,12.1).length,0);
});

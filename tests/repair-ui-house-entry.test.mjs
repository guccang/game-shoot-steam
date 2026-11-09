// 修复圆环与点击入屋专项：正式状态驱动绘制，点击与站立入口均保留校验。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS,RESTORATION_SECONDS} from '../src/config/town-restoration.js';
import {drawRestorationBuildCountdown,drawRestorationTransfer} from '../src/rendering/town-restoration.js';
import {canClickCottage,enterCottage,leaveCottage,updateCottage} from '../src/core/home/cottage.js';
import {COTTAGE} from '../src/config/cottage.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
import {mainlineObjective,mainlineSteps} from '../src/core/story/mainline-manager.js';
import {Renderer} from '../src/rendering/renderer.js';
import {CombatCamera} from '../src/rendering/camera.js';
import {StoryCamera} from '../src/rendering/story-camera.js';

// 最小真实营地只准备解锁与位置，入室和修复显示均调用正式入口。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p);g.start();g.vehicle.active=false;g.mainlineSpeech=null;Object.assign(g.player,{x:COTTAGE.door.x+60,y:COTTAGE.door.y+40,vx:0,vy:0});return g;}
// 记录正式Canvas调用，检查进度圆弧和数字，不复制绘制器实现。
function canvas(){const calls=[];return {calls,c:new Proxy({}, {get:(o,k)=>o[k]??((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)})};}

test('全部13项设施显示同款圆环和剩余秒数，暂停不改变施工状态',()=>{
 const g=scene();
 for(const f of TOWN_RESTORATIONS)for(const zoom of [.6,.85,1.05]){
  g.progress.restoration.build={id:f.id,elapsed:1.4,x:f.x,y:f.y};const {c,calls}=canvas(),before=structuredClone(g.progress.restoration.build);
  drawRestorationBuildCountdown(c,g,zoom);assert.equal(calls.filter(x=>x[0]==='arc').length,2,f.id);assert.ok(calls.some(x=>x[0]==='fillText'&&x[1]==='2'),f.id);
  assert.ok(calls.some(x=>x[0]==='scale'&&x[1]===1/zoom));g.state='paused';calls.length=0;drawRestorationBuildCountdown(c,g,zoom);assert.deepEqual(g.progress.restoration.build,before);g.state='playing';
  calls.length=0;drawRestorationTransfer(c,g,false,zoom);assert.ok(calls.some(x=>x[0]==='fillText'&&x[1]==='修复中'));
 }
});

test('保存失败显示重试，结束与离开森林后无残留圆环',()=>{
 const g=scene(),{c,calls}=canvas();g.progress.restoration.build={id:'cottage',elapsed:RESTORATION_SECONDS,x:COTTAGE.door.x,y:COTTAGE.door.y};g.restorationError='失败';
 drawRestorationBuildCountdown(c,g);assert.ok(calls.some(x=>x[0]==='fillText'&&x[1]==='保存待重试'));
 for(const change of [()=>g.realm={mode:'tower'},()=>{g.realm=null;g.cottage={kind:'cottage'};},()=>{g.cottage=null;g.mapId='jiuzhaigou';},()=>{g.mapId='forest';g.progress.restoration.build=null;}]){
  change();calls.length=0;drawRestorationBuildCountdown(c,g);assert.equal(calls.length,0);
 }
});

test('门前没有点击入屋按钮，任务卡说明一秒候停方式',()=>{
 const g=scene();Object.assign(g.player,COTTAGE.door);assert.notEqual(nearbyInteraction(g)?.type,'cottage');assert.ok(canClickCottage(g));
 assert.match(mainlineObjective(g).label,/停留1秒/);assert.match(mainlineSteps(g)[0].hint,/载具留在门口/);
 assert.ok(enterCottage(g));assert.equal(g.cottage.kind,'cottage');assert.equal(g.cottageEntry,null);assert.equal(enterCottage(g),false);
 assert.ok(leaveCottage(g));updateCottage(g,1,{x:0,y:0});assert.equal(g.cottage,null,'出门后不立即重复进屋');
});

test('未修复、距离、驾驶、暂停、施工与战斗均不能从点击绕过',()=>{
 for(const mutate of [g=>g.progress.restoration.repaired=[],g=>g.player.x+=500,g=>g.vehicle.active=true,g=>g.state='paused',g=>g.progress.restoration.build={id:'tower'},g=>g.boss={},g=>g.mainlineSpeech={},g=>g.realm={mode:'tower'},g=>g.story={}]){
  const g=scene();mutate(g);assert.equal(canClickCottage(g),false);assert.notEqual(nearbyInteraction(g)?.type,'cottage');assert.equal(enterCottage(g),false);
 }
});

test('门前站定一秒自动进入，附近提示不抢先推进倒计时',()=>{
 const g=scene();Object.assign(g.player,COTTAGE.door);
 for(let i=0;i<19;i++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage,null);assert.notEqual(nearbyInteraction(g)?.type,'cottage');
 updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage.kind,'cottage');
});

test('短屏施工不平移或缩放镜头，人物保持正常跟随位置',()=>{
 const g=scene();
 for(const f of TOWN_RESTORATIONS){
  Object.assign(g.player,{x:f.x,y:f.y+55});g.progress.restoration.build={id:f.id,elapsed:1.4,x:f.x,y:f.y+55};
  const width=320,height=568,zoom=.85,base={x:f.x-width/zoom/2,y:g.player.y+30-height/zoom/2,width,height,w:width/zoom,h:height/zoom,zoom};
  const renderer={game:g,width,height,camera:new CombatCamera(),storyCamera:new StoryCamera(),reduced:{matches:false},environment:{},ground:{setMap(){},setSceneryMask(){},update(){}}};
  const view=Renderer.prototype.prepareGround.call(renderer);assert.equal(view.zoom,base.zoom);assert.equal(view.x,base.x);assert.equal(view.y,base.y);
 }
});

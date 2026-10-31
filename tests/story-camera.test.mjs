// 镜头专项：静止对话、边缘最小调整、冻结时钟及结束恢复，不覆盖无关战斗系统。
import test from 'node:test';
import assert from 'node:assert/strict';
import {StoryCamera} from '../src/rendering/story-camera.js';
import {CombatCamera} from '../src/rendering/camera.js';
// 固定可视区与两位发言人，使用真实相同的头部锚点结构。
function fixture(){
  const camera=new StoryCamera(),normal={x:0,y:0,w:400,h:600,width:400,height:600,zoom:1};
  const speakers=[{anchor:{x:180,y:350},head:48},{anchor:{x:250,y:400},head:43}];
  const speech={conversationKey:'one',...speakers[0],speakers};
  camera.layout={key:'one',top:60,height:160};camera.update(normal,null,0);
  return {camera,normal,speech};
}

test('同屏说话者切换与普通跟随目标变化均不改变对话镜头和倍率',()=>{
  const {camera,normal,speech}=fixture();
  for(let i=1;i<=120;i++){
    const view=camera.update({...normal,x:i,zoom:.75}, {...speech,...speech.speakers[i%2]},i/60);
    assert.deepEqual(view,normal);
  }
});

test('越界只移动必要距离，提前容纳整段人物；切换行后零位移',()=>{
  const {camera,normal,speech}=fixture();speech.speakers[1].anchor.x=410;
  const first=camera.update(normal,speech,1/60);
  assert.ok(first.x>0&&first.x<=4);assert.equal(first.y,0);
  for(let i=2;i<180;i++)camera.update(normal,speech,i/60);
  assert.equal(camera.view.x,42);assert.equal(camera.view.y,0);
  const old={...camera.view};
  assert.deepEqual(camera.update(normal,{...speech,...speech.speakers[1]},3),old);
});

test('测量前保持镜头；冻结战斗不妨碍表现缓动，结束平滑返回',()=>{
  const {camera,normal,speech}=fixture();camera.layout=null;speech.anchor.y=160;
  assert.deepEqual(camera.update(normal,speech,.016),normal);
  camera.layout={key:'one',top:60,height:160};
  for(let i=2;i<180;i++)camera.update(normal,speech,i/60);
  assert.equal(camera.view.y,-122);
  const first=camera.update(normal,null,3);assert.ok(first.y<0&&first.y>-122);
  for(let i=181;i<360;i++)camera.update(normal,null,i/60);
  assert.deepEqual(camera.view,normal);assert.equal(camera.returning,false);
});

test('窗口改变重算安全区，减少动态最小校正，场景重置不继承偏移',()=>{
  const {camera,normal,speech}=fixture();
  const small={...normal,width:320,w:320};speech.speakers[1].anchor.x=350;
  const view=camera.update(small,speech,.1,true);
  assert.equal(view.x,62);assert.equal(view.width,320);
  camera.reset();assert.deepEqual(camera.update(normal,null,.2),normal);
});

test('非对白阶段始终沿用地图武器倍率和移动跟随，不积累第二套镜头缓动',()=>{
  for(const [width,height] of [[320,568],[390,844],[560,900]])
  for(const kind of ['normal','sniper','funnel','pulse'])
  for(const reduced of [false,true]){
    const normalCamera=new CombatCamera(),storyCamera=new StoryCamera();
    for(let frame=0;frame<90;frame++){
      const player={x:780+frame,y:900-frame/2};
      const normal=normalCamera.update(player,width,height,{kind},frame/60,reduced);
      const view=storyCamera.update(normal,null,frame/60,reduced);
      assert.deepEqual(view,normal);
      assert.equal(storyCamera.returning,false);
    }
  }
});


test('同地图接取、暂离和恢复章节从新角色视角开始，不能继承旧位置、倍率与气泡量测',()=>{
  const {camera,normal,speech}=fixture(),session={runId:'chapter-two'};
  // 森林广角与新章起点不同，首帧必须直接采用新章的普通视角。
  camera.update({...normal,x:500,y:900,zoom:.6},null,0);
  const entry={...normal,x:70,y:50};
  assert.deepEqual(camera.update(entry,speech,.1,false,session),entry);
  assert.equal(camera.layout,null);
  camera.layout={key:'one',top:60,height:160};
  // 同会话仍锁定对话构图，不因普通镜头的移动或预热重算而重置。
  const copied=Object.assign(new StoryCamera(),camera);
  assert.deepEqual(copied.update({...entry,x:75},speech,.2,false,session),entry);
  assert.equal(camera.scene,session);
  const forest={...normal,x:600,y:950,zoom:.75};
  assert.deepEqual(camera.update(forest,null,.3,false,null),forest);
  assert.equal(camera.returning,false);
  // 同一存档 runId 重新恢复会创建新会话，依然按检查点重新取景。
  assert.deepEqual(camera.update(entry,speech,.4,false,{runId:session.runId}),entry);
  camera.reset();assert.equal(camera.scene,null);
});

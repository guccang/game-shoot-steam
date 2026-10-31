// 正式预热镜头跨过营地交互边界时必须与正常跟随完全一致。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {Renderer} from '../src/rendering/renderer.js';
import {CombatCamera} from '../src/rendering/camera.js';
import {StoryCamera} from '../src/rendering/story-camera.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {nearbyInteraction} from '../src/core/nearby-interaction.js';

// 固定玩法条件，沿用正式候选选择与渲染器预热入口。
function fixture(height,active){
 const g=new Game(freshProgress());g.state='playing';g.progress.arrival={version:2,phase:'complete',keys:true};
 g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);g.vehicle.active=active;g.mainlineSpeech=null;
 const renderer={game:g,width:320,height,camera:new CombatCamera(),storyCamera:new StoryCamera(),reduced:{matches:false},environment:{},
  ground:{setMap(){},setSceneryMask(){},update(){}}};
 return {g,renderer};
}

test('步行驾驶、长短屏往返建筑范围，预热不产生额外位移或倍率变化',()=>{
 for(const height of [390,568,844])for(const active of [false,true]){
  const {g,renderer}=fixture(height,active),site=WORKSHOP_INTERIORS.weapons.site,targets=new Set();
  let previous=null;
  for(let frame=0;frame<380;frame++){
   Object.assign(g.player,{x:site.x+90,y:site.y+230-(frame<=190?frame:380-frame)});g.time=frame/60;
   targets.add(nearbyInteraction(g)?.id||'none');
   const view=Renderer.prototype.prepareGround.call(renderer);
   assert.equal(view.zoom,.85);assert.ok(Math.abs(view.x-(g.player.x-160/.85))<1e-8);
   assert.ok(Math.abs(view.y-(g.player.y+30-height/2/.85))<1e-8);
   if(previous)assert.ok(Math.abs(Math.abs(view.y-previous.y)-1)<1e-8,'匀速移动没有额外加速或回弹');
   previous=view;
  }
  assert.ok(targets.size>=2);
 }
});

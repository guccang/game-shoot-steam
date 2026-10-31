// 生活短句仅来自镜头中的居民，以头顶小气泡展示口头禅，不移动镜头或阻挡操作。
import {createCompactSpeech} from './compact-speech.js';
import {sceneLayout} from './scene-layout.js';
import {sceneResident} from './scene-resident.js';
import {mainlineObjective} from '../core/mainline-manager.js';
import {RESIDENT_CHATTER} from '../config/resident-chatter.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {livingResidents} from '../core/living-world.js';
import {nearest,worldDistance} from '../world/coordinates.js';
// 单泡限频，暂停与剧情时隐藏；同一居民轮换台词，避免连续重复。
export function createResidentChatter({game,root,renderer,random=Math.random}){
 const frame=root.getElementById('game-frame'),speech=createCompactSpeech(root,'resident-chatter');
 let next=0,current=null,until=0;const last=new Map();
 // 先判断屏幕空间再选择说话人，避免把远处秘密钉到屏幕边缘。
 function render(){
  const v=renderer.view;
  // 候门期间给猫头顶徽记留白，闲聊延后，不遮住当前交互与角色。
  if(!v||!livingForest(game)||game.state!=='playing'||game.arrivalPending||game.campDefense||game.mainlineSpeech||game.buildingEntry||game.cottageEntry||mainlineObjective(game)?.clearingStage==='accept'||root.querySelector('dialog[open]')){current=null;next=game.time+5;speech.hide();return;}
  if(current&&game.time>=until)current=null;
  // 闲聊间隔内无需读取布局或遍历候选居民；到时仍按当前镜头重新选人。
  if(!current&&game.time<next){speech.hide();return;}
  const {frame:r,canvas}=sceneLayout(renderer,frame);
  const project=actor=>{actor=sceneResident(renderer,actor);const p=nearest(actor,{x:v.x+v.w/2,y:v.y+v.h/2});return {x:(p.x-v.x)*v.zoom+canvas.left-r.left,y:(p.y-70-(actor.elevation||0)-v.y)*v.zoom+canvas.top-r.top};};
  const candidates=livingResidents(game).filter(actor=>{const p=project(actor);return livingSafePoint(actor)&&worldDistance(actor,game.player)<430&&p.x>70&&p.x<r.width-70&&p.y>235&&p.y<r.height-165;});
  if(!current&&game.time>=next&&candidates.length){
   const actor=candidates[Math.floor(random()*candidates.length)],lines=RESIDENT_CHATTER[actor.id];
   const index=last.has(actor.id)?(last.get(actor.id)+1)%lines.length:Math.floor(random()*lines.length);last.set(actor.id,index);
   current={actor,text:lines[index]};until=game.time+6;next=until+10+random()*10;
  }
  if(!current||!candidates.includes(current.actor)){speech.hide();return;}
  speech.show(current.actor,current.text,renderer,{minTop:180,bottom:150});
 }
 // 重建应用时移除节点和临时台词时钟。
 function dispose(){speech.dispose();}
 return {render,dispose};
}

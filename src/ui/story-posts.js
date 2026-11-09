import {setHidden} from './shared/dom-state.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
// 世界任务标记投影到正式建筑上；点击和E键共用距离权限，不出现泛营地底部按钮。
import {worldStoryPosts,canUseStoryPost,canManageStoryPost,nearbyStoryPost,storyPostApproach} from '../core/story/story-posts.js';
import {createEventScope} from '../platform/events.js';
import {nearbyLivingInteraction} from '../core/camp/living-world.js';
// 每个配置地点复用一个可访问按钮，卸载时清理监听和DOM。
export function createStoryPostMarkers({game,root,renderer,open}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),nodes=new Map();
 // 按正式镜头投影，画外不钉边、不抢方向操作；远处点击先指引走近。
 function renderFrame(){
  const posts=!game.arrivalCinematic&&renderer.view&&game.state==='playing'&&!root.querySelector('dialog[open]')?worldStoryPosts(game):[],ids=new Set(posts.map(p=>p.id));
  for(const [id,n] of nodes)if(!ids.has(id))setHidden(n,true);
  for(const post of posts){
   let n=nodes.get(post.id);if(!n){n=root.createElement('button');n.className='story-post-marker';n.dataset.storyPost=post.id;sceneHit(n,post.name);frame.append(n);nodes.set(post.id,n);
    scope.on(n,'click',e=>{if(e.detail!==0||game.state!=='playing'||root.querySelector('dialog[open]'))return;if(canUseStoryPost(game,post)||canManageStoryPost(game,post))open(post);else if(!game.story)requestWorldNavigation(game,{...storyPostApproach(post),id:post.id},'前往'+post.name,{direct:true});});}
   placeSceneHit(n,post,renderer,frame,{width:116,height:115});

  }
 }
 // 仅在世界探索时接收E键，剧情交互继续交给原任务按钮。
 scope.on(root,'keydown',e=>{if(frame.dataset.page==='title'||e.code!=='KeyE'||e.repeat||e.defaultPrevented||game.state!=='playing'||root.querySelector('dialog[open]')||nearbyLivingInteraction(game)?.step)return;const post=nearbyStoryPost(game);if(post){e.preventDefault();open(post);}});
 // 章节中仅保留当前任务驿牌，其他世界入口继续隐藏。
 function dispose(){scope.dispose();for(const n of nodes.values())n.remove();nodes.clear();}
 return {renderFrame,dispose};
}

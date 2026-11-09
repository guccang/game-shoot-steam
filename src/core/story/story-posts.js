import { i18nText } from "../../i18n/index.js";
// 地点查询与进入权限共用一张表，界面、地图和任务入口不得各自写死营地坐标。
import {STORY_POSTS} from '../../config/story-posts.js';
import {STORY_CAMPAIGN} from '../../config/story-campaign.js';
import {MAPS} from '../../world/maps.js';
import {worldDistance} from '../../world/coordinates.js';
import {WEAPONS} from '../../config/weapons.js';
import {COLLECTED_VEHICLES} from '../../config/vehicles.js';
import {MATERIAL_KEYS} from '../../config/materials.js';
// 无效地图、重复地点与不存在的故事在注册时明确失败。
export function validateStoryPosts(posts=STORY_POSTS){
 const ids=new Set();for(const p of posts){
  if(!p.id||ids.has(p.id)||!MAPS.some(m=>m.id===p.mapId)||!p.name||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!(p.radius>0)||!Number.isFinite(p.radius)||!Number.isFinite(p.approach?.dx)||!Number.isFinite(p.approach?.dy)||!p.chapters?.length||new Set(p.chapters).size!==p.chapters.length||p.chapters.some(id=>!Object.hasOwn(STORY_CAMPAIGN,id)))throw Error(i18nText("core.story-posts.3922767de4", { p0: (p.id) }));
  if((p.equipmentChapters||[]).some(id=>!Object.hasOwn(STORY_CAMPAIGN,id)))throw Error('装备故事入口引用无效章节');
  if(!p.collection)throw Error(i18nText("core.story-posts.e2a28d8d35", { p0: (p.id) }));
  {const c=p.collection,seen=new Set();
   if(!c.title||!c.text||!Number.isInteger(c.duplicateCoins)||c.duplicateCoins<0||!Array.isArray(c.options)||!c.options.length)throw Error(i18nText("core.story-posts.0784667157", { p0: (p.id) }));
   for(const o of c.options){
    if(!o.id||seen.has(o.id))throw Error(i18nText("core.story-posts.246678fdf4", { p0: (p.id) }));
    if(o.kind==='resources'){
      const entries=Object.entries(o.resources||{});
      if(typeof o.name!=='string'||!o.name.trim()||!entries.some(([,n])=>n>0)||entries.some(([key,n])=>!['coins','wood',...MATERIAL_KEYS].includes(key)||!Number.isSafeInteger(n)||n<0))throw Error(i18nText("core.story-posts.5ddb3c8229", { p0: (p.id) }));
      // 整组礼包与单篇故事采用同样的三种资源上限。
      if(entries.filter(([,n])=>n>0).length>3)throw Error(i18nText("core.story-posts.1a3ba8bb14", { p0: (p.id) }));
    }else{
      const list=o.kind==='vehicle'?COLLECTED_VEHICLES:o.kind==='weapons'?WEAPONS:null;
      if(!Number.isInteger(o.index)||!list?.[o.index])throw Error(i18nText("core.story-posts.84bb6779fa", { p0: (p.id) }));
    }
    seen.add(o.id);
   }
  }
  ids.add(p.id);
 }return posts;
}
validateStoryPosts();
// 交互点落在驿牌前方，独立于屋顶绘制高度。
export function storyPostApproach(post){return {x:post.x+post.approach.dx,y:post.y+post.approach.dy};}
// 管理入口与接取入口承认附加装备故事，原收藏清单仍只读取chapters。
const hasChapter=(post,id)=>post.chapters.includes(id)||(post.equipmentChapters||[]).includes(id);
// 世界常驻标记在章节中只保留本章驿牌，秘境内隐藏全部世界入口。
export function worldStoryPosts(game){return game.realm?[]:STORY_POSTS.filter(p=>p.mapId===game.mapId&&(!game.story||hasChapter(p,game.story.chapterId)));}
// 章节中保留本章驿牌的管理入口；不授予领取收藏或接取另一章的权限。
export function canManageStoryPost(game,post){return !!game.story&&!!post&&hasChapter(post,game.story.chapterId)&&!game.realm&&!game.arrivalCinematic&&game.state!=='dead'&&game.mapId===post.mapId&&worldDistance(game.player,storyPostApproach(post))<=post.radius;}
// 指定故事查找所在地点；可用于远处目录提示，不允许借此远程进入。
export function storyPostForChapter(game,id,postId=null){return STORY_POSTS.filter(p=>hasChapter(p,id)&&(!postId||p.id===postId))
 .sort((a,b)=>(a.mapId!==game.mapId)-(b.mapId!==game.mapId)||worldDistance(game.player,storyPostApproach(a))-worldDistance(game.player,storyPostApproach(b)))[0]||null;}
// 距离、安全状态和所属地图必须同时成立；暂停目录仍可提交有效进入意图。
export function canUseStoryPost(game,post){return !!post&&!game.arrivalCinematic&&!game.story&&!game.realm&&!game.boss&&game.state!=='dead'&&game.mapId===post.mapId&&worldDistance(game.player,storyPostApproach(post))<=post.radius;}
// E键与触屏选择同一个最近可用地点，不再绑定全营地区域。
export function nearbyStoryPost(game){return worldStoryPosts(game).filter(p=>canUseStoryPost(game,p)||canManageStoryPost(game,p)).sort((a,b)=>worldDistance(game.player,storyPostApproach(a))-worldDistance(game.player,storyPostApproach(b)))[0]||null;}

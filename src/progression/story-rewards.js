import { creditResource } from './resource-wallet.js';
import {rewardReceipt} from './reward-receipt.js';
import { i18nText } from "../i18n/index.js";
// 委托板一次性赠礼与获取来源：武器、载具、资源包共用先保存再提交的领取事务。
import {STORY_POSTS} from '../config/story-posts.js';
import {WEAPONS} from '../config/weapons.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {grantVehicleArmament} from '../config/vehicle-armaments.js';
import {canUseStoryPost} from '../core/story-posts.js';
import {validateProgress} from './progress.js';
import {createVehicle} from '../combat/vehicle.js';
import {biomeAt} from '../world/biomes.js';
// 装备名称始终来自正式目录，不在对白和奖励界面复制编号映射。
export function storyEquipmentName(option){return option.kind==='resources'?option.name:(option.kind==='vehicle'?COLLECTED_VEHICLES:WEAPONS)[option.index].name;}
// 已拥有的装备折算金币，绝不重置等级、部件或当前出战配置。
export function ownsStoryEquipment(progress,option){return option.kind!=='resources'&&(option.kind==='vehicle'?progress.vehicleHulls:progress.weapons)[option.index]>0;}
// 文案由当前选项数生成，单份和多选一遵守相同的一次性规则。
export function storyCollectionChoice(post){const n=post.collection.options.length;return n===1?i18nText("progression.story-rewards.f8c0d00bf7"):n===2?i18nText("progression.story-rewards.0893522774"):i18nText("progression.story-rewards.cbc64a4fca", { p0: (n) });}
// 完成记录与单篇奖励都保存后，才允许领取整组谢礼。
export function storyCollectionStatus(progress,post){
 const count=post.chapters.filter(id=>progress.story.chapters[id]?.completed&&progress.story.chapters[id]?.rewardClaimed).length;
 return {count,total:post.chapters.length,ready:count===post.chapters.length,claimed:progress.story.boardRewards?.[post.id]||null};
}
// 工坊、背包和载具详情共用故事来源，包括二选一限制和已领取状态。
export function storyEquipmentSource(progress,kind,index){
 return STORY_POSTS.filter(p=>p.collection.options.some(o=>o.kind===kind&&o.index===index)).map(post=>{
   const s=storyCollectionStatus(progress,post);
   return i18nText("progression.story-rewards.00619d054e", { p0: (biomeAt(post.x,post.y,post.mapId).name), p1: (post.name), p2: (s.total), p3: (storyCollectionChoice(post)), p4: (s.count), p5: (s.total), p6: (s.claimed?i18nText("progression.story-rewards.4ee2749a55"):i18nText("progression.story-rewards.ca90cc9da0")) });
 }).join(' ');
}
// 领取限定当地安全入口；失败不改变内存与钱包，重试和连点也不会重复授予。
export function claimStoryCollection(game,postId,optionId){
 const post=STORY_POSTS.find(p=>p.id===postId),option=post?.collection?.options.find(o=>o.id===optionId);
 if(!option||!canUseStoryPost(game,post)||game.progress.story.run)return {ok:false,message:i18nText("progression.story-rewards.efbd9921ab")};
 const status=storyCollectionStatus(game.progress,post);
 if(status.claimed||!status.ready)return {ok:false,message:status.claimed?i18nText("progression.story-rewards.848ebeb4a0"):i18nText("progression.story-rewards.fc7cca713f")};
 const before=game.progress,next=validateProgress(structuredClone(game.progress)),owned=ownsStoryEquipment(next,option);
 if(option.kind==='resources'){
   for(const [key,amount] of Object.entries(option.resources)){
     creditResource(next,key,amount);
   }
 }
 else if(owned)creditResource(next,'coins',post.collection.duplicateCoins);
 else if(option.kind==='vehicle'){next.vehicleHulls[option.index]=1;grantVehicleArmament(next,option.index);}
 else next.weapons[option.index]=1;
 next.story.boardRewards??={};next.story.boardRewards[post.id]=option.id;
 let saved=false;try{saved=(game.storyPersist?.(next)??true)===true;}catch{saved=false;}
 if(!saved)return {ok:false,message:i18nText("progression.story-rewards.bb03856cd2")};
 game.progress=next;
 if(!owned&&option.kind==='vehicle')game.vehicles[option.index]=createVehicle(next,game.maxHp(),option.index);
 game.onEvent('story-change');game.onEvent('task-reward',rewardReceipt(before,next,post.collection.title));
 return {ok:true,message:option.kind==='resources'?i18nText("progression.story-rewards.3aff123908", { p0: (storyEquipmentName(option)) }):owned?i18nText("progression.story-rewards.987b3d159d", { p0: (storyEquipmentName(option)), p1: (post.collection.duplicateCoins) }):i18nText("progression.story-rewards.a6704a7fd7", { p0: (storyEquipmentName(option)) })};
}

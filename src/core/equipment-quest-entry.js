// 装备故事允许在关联委托板或真实委托人身边接取，远处查看不授予进入权限。
import {EQUIPMENT_QUESTS} from '../config/equipment-quests.js';
import {residentFor} from './living-world.js';
import {storyPostForChapter,storyPostApproach,canUseStoryPost} from './story-posts.js';
import {worldDistance} from '../world/coordinates.js';

// 使用当前作息中的人物位置；任务导航到静态坐标后仍须通过现场距离检查。
export function equipmentQuestDestination(game,id){
 const q=EQUIPMENT_QUESTS.find(q=>q.chapter===id),resident=q&&residentFor(game,q.host);
 if(resident&&game.mapId==='forest')return {...resident,mapId:'forest',name:resident.name};
 const post=storyPostForChapter(game,id);return post?{...storyPostApproach(post),mapId:post.mapId,name:post.name}:null;
}

// 复用世界入口安全条件，人物入口同样禁止战斗、秘境和其他章节中接取。
export function canEnterEquipmentQuest(game,id,postId=null){
 if(!EQUIPMENT_QUESTS.some(q=>q.chapter===id))return false;
 if(postId&&!storyPostForChapter(game,id,postId))return false;
 if(canUseStoryPost(game,storyPostForChapter(game,id,postId)))return true;
 const target=equipmentQuestDestination(game,id);
 return !!target&&!game.story&&!game.realm&&!game.boss&&!game.fireActive&&!game.campDefense&&!game.arrivalCinematic&&game.state!=='dead'&&game.mapId===target.mapId&&worldDistance(game.player,target)<=110;
}

// 主动交谈事务：现场资格、随机不重复、交情与线索保存一次完成；绝不接取任务或发放装备。
import {NPC_DIALOGUES,SHOP_DIALOGUE_ALIASES} from '../config/npc-dialogue.js';
import {TREASURE_SITES} from '../config/treasure.js';
import {MONSTER_CAMPS,CAMP_CHARACTERS,campCharacterSite,campSignSite,MONSTER_CAMP_RULES} from '../config/monster-camps.js';
import {interiorShopkeeper,SHOPKEEPER_ENTRY} from '../config/workshop-interiors.js';
import {campResidents,campResidentsVisible} from './camp-routines.js';
import {livingResidents} from './living-world.js';
import {livingForest} from '../world/living-spaces.js';
import {worldDistance} from '../world/coordinates.js';
import {bossCombatActive} from './boss-engagement.js';
import {monsterCampsAvailable} from './monster-camps.js';
import {arrivalPending} from '../config/ranger-arrival.js';
import {validateProgress} from '../progression/progress.js';
import {npcDialogueStage} from '../progression/npc-dialogue.js';
import {learnTreasureClue} from '../progression/treasure.js';
import {capturePatrol} from './patrol-session.js';

// 室内外同一个人共享交情，柜台身份必须与实际房间匹配。
export function dialogueIdentity(id){return typeof id==='string'&&id.startsWith('shop:')?(SHOP_DIALOGUE_ALIASES[id.slice(5)]||id):id;}
// 每次接话都重新验证实际位置；暂停的对白页允许继续说话，战斗或离开现场不允许远程刷取。
export function canConverse(game,source){
 if(typeof source!=='string'||!Object.hasOwn(NPC_DIALOGUES,dialogueIdentity(source))||!['playing','paused'].includes(game.state)||game.player.hp<=0||arrivalPending(game.progress)||game.mainlineSpeech||bossCombatActive(game))return false;
 const [kind,id]=source.split(':');
 if(kind==='shop')return game.cottage?.kind===id&&worldDistance(game.player,interiorShopkeeper(game.cottage))<=SHOPKEEPER_ENTRY.clickRadius;
 if(game.cottage)return false;
 if(kind==='camp')return campResidentsVisible(game)&&campResidents(game).some(r=>r.id===id&&worldDistance(game.player,r)<=150);
 if(kind==='resident')return livingForest(game)&&livingResidents(game).some(r=>r.id===id&&worldDistance(game.player,r)<=110);
 if(!monsterCampsAvailable(game))return false;
 const camp=MONSTER_CAMPS.find(c=>c.id===(kind==='wild'?CAMP_CHARACTERS.find(n=>n.id===id)?.camp:id));
 return !!camp&&camp.mapId===game.mapId&&(kind==='wild'?[campCharacterSite(camp)]:[camp,campSignSite(camp)]).some(site=>worldDistance(game.player,site)<=MONSTER_CAMP_RULES.interact);
}
// 当前层读完一轮后重新洗牌，避免连续重复；秘密第一次解锁时优先展示，随机只影响同层其余内容。
export function chooseNpcLine(npc,record,random=Math.random){
 const stage=npcDialogueStage(record.count),pool=npc.lines.filter(l=>l.stage===stage);
 let seen=record.seen.filter(id=>npc.lines.some(l=>l.id===id)),unread=pool.filter(l=>!seen.includes(l.id));
 if(!unread.length){seen=seen.filter(id=>!pool.some(l=>l.id===id));unread=pool;}
 const secret=unread.find(l=>(l.treasure||l.campClue)&&!record.seen.includes(l.id));
 let options=unread.filter(l=>l.id!==record.last);
 // 最高层只有一条的普通营地人物，读完后回忆其他层，仍不连续复读。
 if(!options.length)options=npc.lines.filter(l=>l.stage<=stage&&l.id!==record.last);
 const sample=random(),index=Math.floor(Math.max(0,Math.min(.999999,Number.isFinite(sample)?sample:0))*options.length);
 const line=secret||options[index];return {line,seen:[...new Set([...seen,line.id])],stage};
}
// 先保存候选快照再替换运行状态；失败时不展示未提交秘密、不计次数，重试也不会重复发奖。
export function converseWithNpc(game,source,random=Math.random){
 if(!canConverse(game,source))return {ok:false,message:'请在安全时靠近这位伙伴，再坐下聊聊。'};
 const id=dialogueIdentity(source),npc=NPC_DIALOGUES[id],record=game.progress.npcDialogue[id]||{count:0,seen:[],last:null};
 const {line,seen,stage}=chooseNpcLine(npc,record,random),next=validateProgress(structuredClone(game.progress)),snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 next.npcDialogue[id]={count:Math.min(1000000,record.count+1),seen,last:line.id};
 let learned=false;
 if(line.treasure)learned=learnTreasureClue(next,TREASURE_SITES.find(site=>site.id===line.treasure));
 if(line.campClue&&!next.monsterCamps.clues.includes(line.campClue)){next.monsterCamps.clues.push(line.campClue);learned=true;}
 let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'这段交谈没能保存，请再试一次。交情和线索没有改变。'};
 game.progress=next;
 return {ok:true,id,npc,line,stage,count:next.npcDialogue[id].count,message:line.text,note:learned?(line.treasure?'线索已记入手机 · 寻宝':'线索已记入手机 · 营地见闻'):''};
}

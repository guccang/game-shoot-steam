// 交谈记录只接收正式人物和对白编号；不迁移旧版存档，不保存界面或随机数状态。
import {NPC_DIALOGUES,NPC_DIALOGUE_STAGES} from '../../config/npc-dialogue.js';
// 校验独立人物的次数与已读池，未知或损坏记录不能开启不存在的秘密。
export function normalizeNpcDialogue(raw){
 const records={};
 for(const [id,npc] of Object.entries(NPC_DIALOGUES)){
  const value=raw?.[id];if(!value||!Number.isSafeInteger(value.count)||value.count<=0)continue;
  const count=Math.min(1000000,value.count),valid=npc.lines.filter(l=>NPC_DIALOGUE_STAGES[l.stage].at<count).map(l=>l.id);
  records[id]={count,seen:[...new Set((Array.isArray(value.seen)?value.seen:[]).filter(key=>valid.includes(key)))],last:valid.includes(value.last)?value.last:null};
  if(Number.isSafeInteger(value.resumeAt)&&value.resumeAt>0)records[id].resumeAt=value.resumeAt;
 }
 return records;
}
// 第一次至第三次初识，第四次至第六次熟悉，第七次开始交心。
export function npcDialogueStage(count=0){return NPC_DIALOGUE_STAGES.findLastIndex(stage=>count>=stage.at);}

// 营地等级只提供购买折扣；保留原入口标识，避免破坏界面事件代理。
import {campProgress,campDiscountText} from '../progression/camp/camp-level.js';
import {challengeRankIcon} from '../rendering/challenge-rank.js';
// 胜利文本读取本次完成后的快照，不把战绩当作购买资格。
export function challengeVictoryText(data){const q=data.qualification;return `${data.clearingComplete?'清缴完成':'领主已击败'}${q.gained?` · 营地经验 +${q.gained}`:''}`;}
// 商店、清缴和追踪共用营地面板，展示当前已应用的优惠。
export function challengeLevelMarkup(progress,camp){return challengeProgressMarkup(campProgress(progress,camp),null,true,camp);}
// 结算快照与实时页面统一绘制，满级时进度条填满。
export function challengeProgressMarkup(q,required=null,interactive=true,camp){
 const full=q.nextXp===null,max=full?1:q.nextXp-q.start,value=full?1:Math.max(0,q.xp-q.start);
 const next=full?'营地已满级':`距 ${q.tier+1} 级还差 ${q.nextXp-q.xp} 经验`;
 const tag=interactive?'button':'section',action=interactive?' type="button" data-challenge-catalog="'+(camp||'')+'" aria-haspopup="dialog" aria-controls="challenge-catalog-dialog"':'';
 return `<${tag}${action} class="challenge-level met" aria-label="营地等级 ${q.tier} 级，购买${campDiscountText(q.percent)}，${next}">
 <span class="challenge-level-heading"><span class="challenge-level-identity">${challengeRankIcon(q.tier)}<strong>营地等级 <b>${q.tier} 级</b></strong></span><span class="challenge-level-required">购买${campDiscountText(q.percent)}</span></span>
 <span class="challenge-progress-label">累计经验 ${q.xp}${full?'':` / ${q.nextXp}`}</span>
 <span class="challenge-progress-track" role="progressbar" aria-label="营地经验" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><i style="width:${value/max*100}%"></i></span>
 <span class="challenge-level-next">${next}</span><small>购买币木享折扣 · 材料原价</small>
 ${interactive?'<span class="challenge-level-link">查看等级优惠与经验来源 ›</span>':''}</${tag}>`;
}

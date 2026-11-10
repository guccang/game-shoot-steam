// 站牌购买只替换外观存档，不触碰站点坐标、编号或正在执行的导航。
import {WAYSTATION_STYLES} from '../../config/waystation-styles.js';
import {normalizeWaystations} from '../../progression/navigation/waystations.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
// 先保存候选数据再兑现扣款；反复点击已拥有款式不会重复收费。
export function applyWaystationStyle(game,id,styleId,persist){
 if(game.player.hp<=0||!['playing','paused'].includes(game.state))return {ok:false,message:'当前无法更换站牌。'};
 const style=WAYSTATION_STYLES.find(s=>s.id===styleId),data={...structuredClone(game.progress.waystations),ownedStyles:normalizeWaystations(game.progress.waystations).ownedStyles},site=data.sites?.find(s=>s.id===id);
 if(!style||!site)return {ok:false,message:'没有找到驿站或站牌样式。'};
 const price=data.ownedStyles.includes(styleId)?0:style.price;if(game.progress.coins<price)return {ok:false,message:'金币不足。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));next.waystations=data;next.coins-=price;site.style=styleId;if(!data.ownedStyles.includes(styleId))data.ownedStyles.push(styleId);
 try{if(persist?.(next)!==true)throw Error('保存失败');}catch{return {ok:false,message:'保存失败，金币和站牌未改变，请重试。'};}
 game.progress=next;game.player.campProgress=next;return {ok:true,message:price?'已购买并换用'+style.name+'，其他驿站也可免费使用。':'已换用'+style.name+'。'};
}

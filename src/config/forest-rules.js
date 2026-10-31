import {displayMeters} from '../world/distance-units.js';
// 玩家规则说明从正式遭遇参数读取，修改数值后说明同步更新。
import {ENCOUNTERS} from './encounters.js';
export const FIRST_HOUR_PLAN=[
 {time:'1分钟',text:'看完短开场，采木修复武器工坊，买到第一把手枪。'},
 {time:'10分钟',text:'修复清缴告示牌与小屋，体验清缴、升级和第一次领主战。'},
 {time:'60分钟',text:'逐步修好回信驿、载具工坊、邻里和挑战设施，找到喜欢的武器与下一次目标。'}
];
// 首小时是节奏目标，实际推进由主线完成与修复决定，不靠挂机计时。
export function forestRuleLines(){return [
 '种田收割获得金币，任务和玩法奖励照常；怪物与领主不掉金币，装备材料仍可获得。',
 '营地与邻里木栏内是安全生活区；正常探索不会在安全区生成敌人。',
 '走出安全区后，主动移动累计 '+ENCOUNTERS.minSeconds+'–'+ENCOUNTERS.maxSeconds+' 秒尝试出现一只遭遇怪；原地站立不推进遭遇计时，已有怪物仍会行动。',
 '遭遇怪在角色周围 '+displayMeters(ENCOUNTERS.minDistance)+'–'+displayMeters(ENCOUNTERS.maxDistance)+' 米的可达位置出现，同时最多 '+ENCOUNTERS.maxAlive+' 只。它们可能出现在视野内，但不会贴身出生。',
 '营地周边怪物为1–3级，沿各方向远离营地逐步升高，最高20级；种类随林区变化，遭遇怪不随清缴波次升级。地图可查看距离与等级带。',
 '修复清缴告示牌后，到指定地点清理五批怪群并挑战领主；结算时可原地继续下一轮，也可关闭结算回营整备。',
 '清缴进行中、领主战、剧情、娱乐、消防和守门战不叠加随机遭遇；离开清缴区域探索时仍可能遇到当地怪物。',
 '暂停和离线不补刷遭遇怪。重新进入巡游或切换地图会重新等待，不会把离线时间积成一批怪物。'
];}

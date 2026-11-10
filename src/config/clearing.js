// 清缴的场景入口与教学节点表；位置、导航、面板和高亮共用稳定身份。
import {TOWN_LAYOUT} from './town-layout.js';
export const CLEARING_POST={id:'clearing-post',name:'清缴告示牌',mapId:'forest',...TOWN_LAYOUT.clearing,radius:120};
export const CLEARING_APPROACH={...CLEARING_POST,x:CLEARING_POST.x,y:CLEARING_POST.y+45};
export const CLEARING_STEPS=[{icon:'accept',label:'接取清缴'},{icon:'travel',label:'前往清缴场'},{icon:'battle',label:'怪潮与领主'}];
// 首轮完成后即可选择继续，保留回营整备，不打断想连续作战的玩家。
export const CLEARING_CONTINUE_ROUND=1;

// 距离上下限仅用于兼容历史场地；新任务按地图等级带选点，保留场地大小。
export const CLEARING_SITE_RULES=Object.freeze({minDistance:1000,maxDistance:3000,radius:300,minSeparation:600,attempts:256});

// 前三级地点留在营地草甸；清缴基础等级固定，强度只由清缴成长表与兵种决定。
export const CLEARING_STARTER_RULES=Object.freeze({biome:'meadow',enemyLevel:1,minDistance:600,maxDistance:1300,minSeparation:250,attempts:1024});

// 清缴界面比作战场地多保留一半距离，移动到边缘仍可查看波次和材料。
export const CLEARING_HUD_RADIUS_SCALE=1.5;

// 寻路抵达站牌前的落脚点，不把清缴战斗半径当作到达距离。
export const CLEARING_NAVIGATION=Object.freeze({offsetY:55,arrivalRadius:60});

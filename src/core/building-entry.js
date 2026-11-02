import {bossCombatActive} from './boss-engagement.js';
// 附近点击只返回入口意图，原场景与界面方法负责真正进入，不复制交易或玩法规则。

// 查看建筑与告示不要求步行；真正进入室内仍由房间控制器检查下车条件。
export function canInspectBuilding(game){return game.mapId==='forest'&&!game.cottage&&!game.arrivalCinematic&&!game.realm&&!game.story&&!game.campDefense&&!game.fireActive&&!game.workshopTrial&&!bossCombatActive(game)&&!game.livingBattle&&!game.mainlineSpeech;}

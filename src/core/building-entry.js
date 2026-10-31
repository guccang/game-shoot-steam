// 附近点击只返回入口意图，原场景与界面方法负责真正进入，不复制交易或玩法规则。

// 查看建筑与告示不要求步行；真正进入室内仍由房间控制器检查下车条件。
export function canInspectBuilding(game){return game.mapId==='forest'&&!game.cottage&&!game.arrivalCinematic&&!game.realm&&!game.story&&!game.campDefense&&!game.fireActive&&!game.workshopTrial&&!game.boss&&!game.livingBattle&&!game.mainlineSpeech;}
// 保留旧入口调用的状态清理接口，主动点击不受闩锁限制。
export function latchBuildingEntry(game,entry){game.buildingEntry=null;game.buildingEntryLatch=entry;}
// 每帧清除旧版候停状态；进入只由附近按钮或场景短按发起。
export function updateBuildingEntry(game){game.buildingEntry=null;game.buildingEntryLatch=null;return null;}

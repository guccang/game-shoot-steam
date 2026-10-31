// 章节全程保留森林常驻建筑；任务节点不决定营地显隐，也不改变建设进度。

// 共享正式存档和当前角色；停驻载具读取冻结森林的车库，避免借用装备污染展示。
export function storyCampScene(game){
  if(!game.story||game.mapId!=='forest'||game.realm)return game;
  return Object.create(game,{story:{value:null},loadout:{value:game.progress},
    vehicles:{value:game.storyForest?.vehicles||game.vehicles},
    parkingVisitors:{value:game.storyForest?.parkingVisitors||game.parkingVisitors}});
}

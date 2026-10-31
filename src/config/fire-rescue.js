// 世界消防事件数值；水箱不足以连续扑完全部火点，必须安排河岸补给路线。
// 雨水每秒削减11点火势，完整火点约6秒熄灭；不消耗消防车水量。
export const FIRE_RESCUE=Object.freeze({vehicle:4,offerSeconds:10,walkSpeed:150,garageSpeed:62,transitAcceleration:220,dockRadius:34,dockSpeed:3,dockSeconds:3,duration:300,water:100,initialWater:45,waterUse:9,refill:26,range:150,extinguish:22,rainExtinguish:11,monsterWaterDamage:35,fireHp:66,fireDamage:6,spreadInterval:32,randomMin:75,randomMax:150,cooldown:180});
// 出入库过场使用稳定状态标识，界面、存档与动作控制器共享。
export const FIRE_TRANSIT_PHASES=Object.freeze(['transferring','approaching','boarding','departing','parking','exiting']);
// 接警先淡出，保持全黑时回到小镇，再淡入恢复步行；时长由逻辑与界面共用。
export const FIRE_TRANSFER=Object.freeze({fadeOut:.25,relocateAt:.4,fadeInAt:.55,duration:.85});
// 借车只开放消防车体，消防水炮使用任务独立供给，不挂载角色枪械。
export function fireEquipment(progress){
 const hulls=[...progress.vehicleHulls],mounts=[...progress.vehicleLoadouts],weapons=[...progress.vehicleWeapons];hulls[4]=Math.max(1,hulls[4]);mounts[4]=null;
 return Object.assign(Object.create(progress),{vehicleIndex:4,vehicleHulls:hulls,vehicleLoadouts:mounts,vehicleWeapons:weapons});
}

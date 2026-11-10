// 营地特色增强弹与照明弹统一目录；主炮基础装填之外，每次开火额外消耗一枚增强弹。
export const SPECIAL_AMMO={
 he:{name:'晴叶高爆弹',camp:'home',color:'#efbc67',radius:125,power:1.25,pack:12,coins:180,use:'爆炸冲击波：125范围溅射，强化主炮清群。'},
 frost:{name:'雪松冰冻弹',camp:'snowcedar',color:'#9cdef1',radius:100,power:.65,pack:12,coins:210,use:'冰晶冲击：范围减速75%，持续4秒；领主减速较弱。'},
 flame:{name:'赤炉火焰弹',camp:'emberforge',color:'#f29a50',radius:105,power:.55,duration:5,pack:12,coins:220,use:'燃烧地面持续5秒，每秒追加主炮伤害的22%。'},
 gas:{name:'苔溪毒气弹',camp:'mossbrook',color:'#b7ce72',radius:140,power:.35,duration:7,pack:12,coins:220,use:'毒气云持续7秒，每秒追加主炮伤害的18%，覆盖更广。'},
 arcShell:{name:'雨铃电弧弹',camp:'rainbell',color:'#b9b5f2',radius:180,power:.85,pack:12,coins:240,use:'电弧跳跃：命中后打击附近最多5名敌人。'},
 seismic:{name:'层岩震荡弹',camp:'stratacove',color:'#d5ad85',radius:155,power:1,duration:0,pack:12,coins:240,use:'震地冲击：大范围爆破与强击退，减速2秒。'},
 flare:{name:'照明弹',camp:'all',color:'#ffe5a1',pack:8,coins:80,use:'夜间自动发射，照亮三个相邻视野区，持续45秒；驶离后补发。'}
};
export const FLARE_RULES=Object.freeze({duration:45,radius:300,spacing:220,departure:270});
// 特色商品只能在来源营地购买，照明弹六座营地通售。
export function ammoSoldAt(key,camp='home'){return !SPECIAL_AMMO[key]||SPECIAL_AMMO[key].camp==='all'||SPECIAL_AMMO[key].camp===camp;}

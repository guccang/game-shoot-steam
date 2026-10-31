// 能量盾作为手持防御装备；不占用载具主炮，也不作为召唤物的攻击模块。
export const ENERGY_SHIELD = Object.freeze({
 id:'energy-shield', name:'能量防护盾', title:'驻车防护',
 description:'野外有小怪，种田有小盾！撑起防护，开开心心播种、浇水、等丰收，小怪靠近也不打断农活。装备后自动抵挡角色与所驾驶载具受到的伤害，载具主炮照常攻击。基础护盾480点，停止受击3秒后每秒恢复60点；破盾后等待6秒再恢复。超出护盾容量的伤害仍会扣除生命或车体耐久。',
 attackKind:'defense', resourceType:'energy', aimAssist:false, targetTrees:false,
 damage:0, interval:1, range:0, magazineSize:480, reloadTime:3,
 shieldRegen:60, shieldBreakDelay:6, pellets:0, spread:0, impulse:0,
 color:'#a8e4d5', coins:4200, wood:520, bosses:0,
});

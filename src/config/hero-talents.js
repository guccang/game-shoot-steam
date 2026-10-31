// 角色专属天赋按稳定身份关联；装甲养护为固定加成，其余天赋沿用等级成长。
import {HEROES} from './heroes.js';
import {GAMEPLAY_VALUES} from './gameplay-values.js';
export const HERO_TALENTS=Object.freeze({
 chestnut:Object.freeze({name:'稳准射击',stat:'handDamage',label:'手持武器伤害',perLevel:.01}),
 mint:Object.freeze({name:'轻快扳机',stat:'handRate',label:'手持武器射速',perLevel:.01}),
 silver:Object.freeze({name:'装甲养护',stat:'hullHealth',label:'载具最大耐久',fixedBonus:.15}),
 mocha:Object.freeze({name:'熟练换弹',stat:'handReload',label:'手持武器装填速度',perLevel:.015}),
 snow:Object.freeze({name:'平稳驾驶',stat:'hullSpeed',label:'载具移动速度',perLevel:.01}),
 police:Object.freeze({name:'巡逻训练',stat:'handReload',label:'手持武器装填速度',perLevel:.012}),
 ink:Object.freeze({name:'炮火专精',stat:'turretDamage',label:'载具机炮伤害',perLevel:.01}),
});
// 预览可指定角色及等级；战斗默认只读当前出战角色，未拥有或非法等级不生效。
export function heroTalent(progress,index=progress?.hero,previewLevel){
 const definition=HERO_TALENTS[HEROES[index]?.id],raw=previewLevel??progress?.heroes?.[index];
 const level=Number.isFinite(raw)?Math.max(0,Math.min(GAMEPLAY_VALUES.progress.maxEquipmentLevel,Math.floor(raw))):0;
 return definition?{...definition,level,bonus:level>0?(definition.fixedBonus??definition.perLevel*level):0}:null;
}
// 各战斗入口按属性键领取一次倍率，不跨手持/车载类别，也不随远征装备无限等级增长。
export function heroTalentMultiplier(progress,stat){
 // 守护布防是独立局内装备，不继承出战角色的手持或驾驶天赋。
 if(progress?.guardianUpgrades)return 1;
 const talent=heroTalent(progress);return 1+(talent?.stat===stat?talent.bonus:0);}
// 射速与装填速度用除法缩短时长；不修改基础目录、弹匣容量或其他属性。
export function applyHeroWeaponTalent(weapon,progress,kind='weapons'){
 if(kind!=='weapons')return weapon;
 const rate=heroTalentMultiplier(progress,'handRate');weapon.interval/=rate;
 if(weapon.chargeTime){weapon.chargeTime/=rate;weapon.cooldown/=rate;}
 if(weapon.controller==='spider')weapon.minionInterval/=rate;
 weapon.reloadTime/=heroTalentMultiplier(progress,'handReload');
 return weapon;
}
